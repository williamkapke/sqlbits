
var slice = Object.call.bind(Array.prototype.slice);
var forEach = Object.call.bind(Array.prototype.forEach);
var isToken = RegExp.prototype.test.bind(/^[A-Z]+$/);

function Statement(token, expression, param){
	this.token = token;
	if(expression) this.expression = expression;
	if(param!==undefined) this.param = param;
}
var Empty = new Statement();

function Param(value, token){
	if(!(this instanceof Param)) return new Param(value, token);
	if(value!==undefined)
		this.v=value;
	if(token) this.token = token;
}
Param.prototype = {
	get DESC() {
		return new Param(this.v, 'DESC');
	},
	get ASC() {
		return new Param(this.v, 'ASC');
	},
	toString: function(){
		var tkn = this.token? this.token : '$';
		return "[" + tkn + " Param]";
	}
}
function Group(token, args){
	var group = [], i=0;
	group.token=token;

	if(args && args.length){
		//$(expression[,param])
		if(typeof args[0]==="string" && token!='_'){
			var param = args[1];
			if(param instanceof Param){
				i=2;
				if(param.hasOwnProperty("v"))
					group.push(new Statement(token, args[0], param));
			}
			else{
				i=1;
				group.push(new Statement(token, args[0]));
			}
		}
		for(;i<args.length;i++){
			var arg = args[i];
			if(typeof arg==="function" && isToken(arg.name)){
				//the next arg must be the expression and then maybe a param
				var subargs = [args[++i]];
				var param = args[i+1];
				if(param instanceof Param){
					i++;
					subargs.push(param)
				}

				var member = tokens[arg.name].apply(this, subargs);
				if(member!==Empty) group.push(member);
			}
			else if((arg instanceof Statement && arg!==Empty) || (Array.isArray(arg) && arg.token)){
				group.push(arg);
			}
			else if(arg instanceof Param){
				if(arg.hasOwnProperty("v"))
					group.push(arg);
			}
			else if(typeof arg==="string"){
				group.push(new Statement('_', arg));
			}
		}
	}

	if(!group.length)
		return Empty;

	//look for a redundant member
	if(group.length===1){
		var token0 = group[0].token;
		if(token0===token || token0 == '$'){
			group[0].token = token;
			return group[0];
		}
	}

	return group;
}
function NumberOnly(token, number){
	if(isNaN(number)) number = 0;
	return new Statement(token, number.toString());
}
var tokens = module.exports = {
	$: function $(arg0){
		if(arguments.length<=1 && (!(arg0 instanceof Statement) || typeof arg0==="undefined")){
			return Param(arg0);
		}
		return Group('$', arguments);
	},
	_: function _(){ return Group('_', arguments); },
	AND: function AND(){ return Group('AND', arguments); },
	OR: function OR(){ return Group('OR', arguments); },
	ON: function ON(){ return Group('ON', arguments); },
	WHERE: function WHERE(){ return Group('WHERE', arguments); },
	"DELETE FROM": function(table){
		if(typeof table!=="string") return Empty;
		return new Statement('DELETE FROM', table);
	},
	"INSERT INTO": function(table, data){
		if(typeof table !== "string" || !data) return Empty;
		var columns = Object.keys(data);
		if(columns.length===0) return Empty;
		var params = [];
		columns.forEach(function(column){
			params.push(new Param(data[column]));
		});
		return new Statement('INSERT INTO', table, [columns,params]);
	},
	IN: function IN(){
		var out = [];
		var values = [];
		function add(value, fromArray){
			if(value===undefined) return;
			var v = value instanceof Param? value.v : value;
			if(~values.indexOf(v)) return;
			values.push(v);
			out.push(arguments.length>1 && !(value instanceof Param)? new Param(value) : value);
		}
		forEach(arguments, function(arg){
			if(Array.isArray(arg)){
				return arg.forEach(add);
			}
			add(arg);
		});
		out = out.filter(function(item){
			return typeof item==="string" || item.hasOwnProperty("v");
		});

		//we must return an empty Param object or Statements like AND
		// will not know if a Param was used. eg: AND("1=", $(99))
		if(!out.length)
			return new Param();

		return new Param(out, 'IN');
	},
	BETWEEN: function BETWEEN(low, high){
		if(low===undefined && high===undefined)
			return new Param();

		return new Param([new Param(low), new Param(high)], 'BETWEEN');
	},
	FROM: function(table){
		if(typeof table!=="string") return Empty;
		return new Statement('FROM', table);
	},
	SET: function(data){
		if(!data || Object.keys(data).length===0)
			return Empty;
		return new Statement('SET', null, data);
	},
	ORDERBY: function(columns){
		return xBY('ORDERBY', arguments)
	},
	GROUPBY: function(){
		return xBY('GROUPBY', arguments)
	},
	LIMIT: function(number){
		return NumberOnly('LIMIT', number);
	},
	OFFSET: function(number){
		return NumberOnly('OFFSET', number);
	}
};
function xBY(token, args){
	var columns = args[0];
	if(!Array.isArray(columns)){
		columns = slice(args);
	}
	else {
		columns = columns.map(function(item){
			return item instanceof Param? item: new Param(item);
		});
	}
	args = columns.filter(function removeNonStrings(item){
		return (typeof item === "string") || (item instanceof Param && typeof item.v ==="string");
	});

	if(!args.length) return Empty;
	var stmt = new Statement(token)
	stmt.args = args;
	return stmt;
}

function Context(){
	var params=[], sql="",i=0;
	var out = this.out = [];
	function getValues(){
		if(out.length!=i){
			this.parameterize();
			sql = out.join('');
		}
		return params;
	}
	function getText(){
		if(out.length!=i){
			this.parameterize();
			sql = out.join('');
		}
		return sql;
	}

	Object.defineProperties(this, {
		sql: {get: getText},
		text: {get: getText},
		params: {get: getValues},
		values: {get: getValues}
	});
	this.parameterize = function parameterize(){
		var out = this.out;
		for(;i<out.length;i++){
			var item = out[i];
			if(typeof item !== "string"){
				var value = item.v;
				var idx = params.indexOf(value);
				idx = (~idx? idx+1 : params.push(value) );
				out[i] = this.createParam(idx);
			}
		}
	};
}
Context.prototype = {
	createParam: function(idx){
		return '$'+idx;
	},
	toString: function(){
		return this.sql;
	},
	processToken: function(){
		throw new Error("Not Implemented");
	},
	SQL: function(){
		var stmt = tokens._.apply(this, arguments);
		return processAndReturnSubcontext(stmt, this);
	},
	SELECT: function(expression){
		var stmt = typeof expression==="string"? new Statement('SELECT', expression) : Empty;
		return processAndReturnSubcontext(stmt, this);
	},
	get INSERT(){
		var ctx = this;
		return {
			INTO: function(table, data){
				var stmt = tokens["INSERT INTO"].apply(this, arguments);
				return processAndReturnSubcontext(stmt, ctx);
			}
		}
	},
	get DELETE(){
		var ctx = this;
		return {
			FROM: function(table){
				var stmt = tokens["DELETE FROM"].apply(this, arguments);
				return processAndReturnSubcontext(stmt, ctx);
			}
		}
	},
	UPDATE: function(table){
		var stmt = typeof table==="string"? new Statement('UPDATE', table) : Empty;
		return processAndReturnSubcontext(stmt, this);
	}
};
Object.keys(tokens).forEach(function(key){
	Context.prototype[key] = function(){
		var stmt = tokens[key].apply(tokens, arguments);
		return processAndReturnSubcontext(stmt, this);
	}
});
function processAndReturnSubcontext(stmt, parent){
	var start = parent.out.length;
	parent.processToken(stmt, parent.out);
	if(parent.hasOwnProperty("end")) {
		parent.end=parent.out.length;
		return parent;
	}

	var sub = { end:parent.out.length };
	sub.toString = function(){
		parent.params;//for it to parameterize
		return parent.out.slice(start, this.end).join('');
	};
	sub.__proto__=parent;
	return sub;
}

module.exports.Statement = Statement;
module.exports.Param = Param;
module.exports.Empty = Empty;
module.exports.Context = Context;


