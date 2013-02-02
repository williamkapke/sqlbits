
var util = require('util'),
	bits = require('./sqlbits'),
	Param = bits.Param,
	Empty = bits.Empty,
	Context = bits.Context;

var forEach = Object.call.bind(Array.prototype.forEach);
var slice = Object.call.bind(Array.prototype.slice);

function processToken(stmt, out){
	if(stmt===Empty) return;
	if(Array.isArray(stmt) && stmt.token){
		return processGroup(stmt, out);
	}

	if(stmt instanceof Param && !stmt.token)
		out.push(stmt);
	else
		writers[stmt.token||'$'](stmt, out);
}

function PGContext(){
	Context.call(this);
	this.processToken = processToken;
}
util.inherits(PGContext, bits.Context);

function processParam(param, out){
	if(param.hasOwnProperty("token"))
		writers[param.token](param, out);
	else out.push(param);
}

var writers = {
	IN: function IN(param, out){
		//convert IN($1) to =$1
		if(param.v.length==1 && (param.v[0] instanceof Param)){
			out.push('=', param.v[0]);
			return;
		}
		param.v.forEach(function(item, i){
			if(!i) {
				if(out.length)
					out.push(' ');
				out.push('IN(');
			}
			else out.push(',');

			if(item instanceof Param)
				processParam(item, out);
			else out.push(item);
		});
		out.push(')');
	},
	BETWEEN: function BETWEEN(param, out){
		var low = param.v[0];
		var high = param.v[1];

		if(out.length) out.push(' ');
		if(low.v===undefined){
			out.push('<=');
			processParam(low, out);
			return;
		}
		if(high.v===undefined){
			out.push('>=');
			processParam(high, out);
			return;
		}

		out.push('BETWEEN(', low, ' AND ', high, ')');
	},
	SELECT: function SELECT(stmt, out){
		if(out.length) out.push(' ');
		out.push('SELECT ', stmt.expression);
	},
	UPDATE: function UPDATE(stmt, out){
		if(out.length) out.push(' ');
		out.push('UPDATE ', stmt.expression);
	},
	"DELETE FROM": function DELETE(stmt, out){
		if(out.length) out.push(' ');
		out.push('DELETE FROM ', stmt.expression);
	},
	FROM: function FROM(stmt, out){
		if(out.length) out.push(' ');
		out.push('FROM ', stmt.expression);
	},
	SET: function(stmt, out){
		if(out.length) out.push(' ');
		out.push('SET ');
		var data = stmt.param;
		var keys = Object.keys(data);
		keys.forEach(function(key,i){
			if(i) out.push(',');
			out.push(key, '=', new Param(data[key]));
		});
	},
	"INSERT INTO": function FROM(stmt, out){
		if(out.length) out.push(' ');
		out.push('INSERT INTO ',stmt.expression,' (', stmt.param[0].join(','), ') VALUES (');
		stmt.param[1].forEach(function(param, i){
			if(i) out.push(',');
			out.push(param);
		});
		out.push(')');
	},
	WHERE: GroupItem,
	AND: GroupItem,
	OR: GroupItem,
	ON: GroupItem,
	$: GroupItem,
	_: function(stmt, out){
		if(out.length) out.push(' ');
		out.push(stmt.expression);
	},
	ORDERBY: function(stmt, out){
		if(out.length) out.push(' ');
		out.push('ORDER BY ', stmt.expression);
	},
	GROUPBY: function(stmt, out){
		if(out.length) out.push(' ');
		out.push('GROUP BY ', stmt.expression);
	},
	LIMIT: function(stmt, out){
		if(out.length) out.push(' ');
		out.push('LIMIT ', stmt.expression);
	},
	OFFSET: function(stmt, out){
		if(out.length) out.push(' ');
		out.push('OFFSET ', stmt.expression);
	}
}
function GroupItem(stmt, out){
	if(stmt.token!='$'){
		if(out.length) out.push(' ');
		out.push(stmt.token, ' ');
	}
	if(stmt.expression)
		out.push(stmt.expression);
	if(stmt.hasOwnProperty("param"))
		processParam(stmt.param, out);
}
function processGroup(group, out){
	if(group.token!='_'){
		if(group.token!='$'){
			if(out.length)
				out.push(' ');
			out.push(group.token);
		}
		group[0].token = '$';
		out.push('(');
	}

	group.forEach(function(stmt){
		processToken(stmt, out);
	});

	if(group.token!='_')
		out.push(')');
}

exports = module.exports = {
	writers: writers,
	SQL: function(){
		return Context.prototype.SQL.apply(new PGContext(), arguments);
	},
	SELECT: function(){
		return Context.prototype.SELECT.apply(new PGContext(), arguments);
	},
	INSERT: {
		INTO: function(){
			return Context.prototype["INSERT INTO"].apply(new PGContext(), arguments);
		}
	},
	DELETE: {
		FROM: function(){
			return Context.prototype["DELETE FROM"].apply(new PGContext(), arguments);
		}
	},
	UPDATE: function(){
		return Context.prototype.UPDATE.apply(new PGContext(), arguments);
	}
};
Object.keys(bits).forEach(function(key){
	exports[key] = bits[key];
});
exports.PGContext = PGContext;

