
var vows = require('vows'),
	assert = require('assert'),
	tokens = require('./../sqltokens'),
	SELECT=tokens.SELECT,
	AND=tokens.AND,
	OR=tokens.OR,
	BETWEEN=tokens.BETWEEN,
	IN=tokens.IN,
	CTX=tokens.CTX,
	x, y, z
;

//var $ = CTX();
//console.log("SELECT "+ $(AND("1=1")), $.params);
//console.log("SELECT "+ $(1), $.params);
//
//
//
//return;

vows.describe("sqltokens tests")
	.addBatch({
		"CTX": {
			"return value": {
				topic: function(){ return CTX(); },
				'should include out and params Arrays': function(topic){
					assert.isArray(topic.out);
					assert.isArray(topic.params);
				}
			},
			"with a single parameter": {
				topic: function(){ var $ = CTX(); return {out:$(1), $:$}; },
				'should output $1 and add the param': function(topic){
					assert.equal(topic.out, "$1");
					assert.lengthOf(topic.$.params, 1);
				}
			},
			"when the variable is undefined":	{
				topic: function(){ var $ = CTX(); return {out:$(undefined), $:$}; },
				'should return an empty string and should\'t add the param': function(topic){
					assert.equal(topic.out, "");
					assert.lengthOf(topic.$.params, 0);
				}
			}
		},
		"AND/OR": {//internally uses the same code
			"with a single parameter": {
				topic: function(){ return CTX(AND("1=1")) },
				'should output: " AND 1=1"': function(topic){
					assert.equal(topic.toString(), " AND 1=1");
				}
			},
			"with a variable": {
				topic: function(){ return CTX(AND("1=", 1))	},
				'should output: " AND 1=$1"': function(topic){
					assert.equal(topic.toString(), " AND 1=$1");
				}
			},
			"when the variable is undefined":	{
				topic: function(){ return CTX(AND("foo BETWEEN ", x, " AND 100"))},
				'the output should be empty and it shouldn\'t contribute any params': function(topic){
					assert.equal(topic.toString(), "");
					assert.isEmpty(topic.params);
				}
			},
			"with a grouped condition":	{
				topic: function(){ return CTX(AND("1=1").OR("2=2"))},
				'should output a parenthesized condition': function(topic){
					assert.equal(topic.toString(), " AND (1=1 OR 2=2)");
				},
				'that doesn\'t output': {
					topic: function(){ return CTX(AND("1=1").OR("2=", x))},
					'should output a parenthesized condition': function(topic){
						assert.equal(topic.toString(), " AND 1=1");
					}
				}
			},
			"additional statements":	{
				topic: function(){ return CTX(AND("1=", 1), OR("2=", 2))},
				'should continue param numbering': function(topic){
					assert.equal(topic.toString(), " AND 1=$1 OR 2=$2");
					assert.lengthOf(topic.params, 2);
				}
			},
			'when the initial condition is ignored but the chained conditions are not': {
				topic: function(){ return CTX(AND("foo=", x).OR("1=1").OR("2=2").AND("3=", y).AND("4=", 4))},
				'it should retain the initial condition type and output the chain': function(topic){
					assert.equal(topic.toString(), " AND (1=1 OR 2=2 AND 4=$1)");
					assert.lengthOf(topic.params, 1);
				}
			},
			"the append parameter":	{
				topic: function(){ return CTX(AND("foo BETWEEN ", 1, " AND 100"))},
				'should append': function(topic){
					assert.equal(topic.toString(), " AND foo BETWEEN $1 AND 100");
					assert.lengthOf(topic.params, 1);
				}
			}
		},
		"IN": {
			"with no parameters": {
				topic: function(){ return CTX(IN()) },
				'should not output anything and shouldn\'t contribute any params': function(topic){
					assert.equal(topic.toString(), "");
					assert.isEmpty(topic.params);
				}
			},
			"with []": {
				topic: function(){ return CTX(IN([])) },
				'should not output anything and shouldn\'t contribute any params': function(topic){
					assert.equal(topic.toString(), "");
					assert.isEmpty(topic.params);
				}
			},
			"with [undefined]": {
				topic: function(){ return CTX(IN([undefined])) },
				'should not output anything and shouldn\'t contribute any params': function(topic){
					assert.equal(topic.toString(), "");
					assert.isEmpty(topic.params);
				}
			},
			"with only 1 param which is undefined": {
				topic: function(){ return CTX(IN(undefined)) },
				'should not output anything and shouldn\'t contribute any params': function(topic){
					assert.equal(topic.toString(), "");
					assert.isEmpty(topic.params);
				}
			},
			"with only 1 param": {
				topic: function(){ return CTX(IN(1)) },
				'should substitute an equals statement and add the parameter': function(topic){
					assert.equal(topic.toString(), "=$1");
					assert.lengthOf(topic.params, 1);
				}
			},
			"with several parameters": {
				topic: function(){ return CTX(IN(1,2,3)) },
				'should output an IN statement and add the parameters': function(topic){
					assert.equal(topic.toString(), " IN($1,$2,$3)");
					assert.lengthOf(topic.params, 3);
				}
			},
			"passing an array": {
				topic: function(){ return CTX(IN([1,2,3])) },
				'should be the same as using parameters': function(topic){
					assert.equal(topic.toString(), " IN($1,$2,$3)");
					assert.lengthOf(topic.params, 3);
				}
			},
			"additional statements": {
				topic: function(){ return CTX(IN(9,"8",7), IN("6",5,"4")) },
				'should continue param numbering': function(topic){
					assert.equal(topic.toString(), " IN($1,$2,$3) IN($4,$5,$6)");
					assert.lengthOf(topic.params, 6);
				}
			}
		},
		"BETWEEN": {
			"when no parameters are passed": {
				topic: function(){ return CTX(BETWEEN()) },
				'the output should be empty': function(topic){
					assert.equal(topic.toString(), "");
					assert.isEmpty(topic.params);
				}
			},
			"passing undefined values": {
				topic: function(){ return CTX(BETWEEN(undefined), BETWEEN(undefined, undefined)) },
				'should be the same as not passing params at all': function(topic){
					assert.equal(topic.toString(), "");
					assert.isEmpty(topic.params);
				}
			},
			"passing a min & max": {
				topic: function(){ return CTX(BETWEEN(1,2)) },
				'should output " BETWEEN min AND max"': function(topic){
					assert.equal(topic.toString(), " BETWEEN $1 AND $2");
					assert.lengthOf(topic.params, 2);
				}
			},
			"passing only a min": {
				topic: function(){ return CTX(BETWEEN(1)) },
				'should output use >= instead of BETWEEN': function(topic){
					assert.equal(topic.toString(), ">=$1");
					assert.lengthOf(topic.params, 1);
				}
			},
			"passing only a max": {
				topic: function(){ return CTX(BETWEEN(undefined,1)) },
				'should output use <= instead of BETWEEN': function(topic){
					assert.equal(topic.toString(), "<=$1");
					assert.lengthOf(topic.params, 1);
				}
			},
			"additional statements": {
				topic: function(){ return CTX(BETWEEN(0,1), BETWEEN(800, "900")) },
				'should continue param numbering': function(topic){
					assert.equal(topic.toString(), " BETWEEN $1 AND $2 BETWEEN $3 AND $4");
					assert.lengthOf(topic.params, 4);
				}
			}
		}
	})
	.export(module);
//	.run();

/*
 AssertionError
 fail
 ok
 equal
 notEqual
 deepEqual
 notDeepEqual
 strictEqual
 notStrictEqual
 throws
 doesNotThrow
 ifError
 match
 matches
 isTrue
 isFalse
 isZero
 isNotZero
 greater
 lesser
 inDelta
 include
 includes
 deepInclude
 deepIncludes
 isEmpty
 isNotEmpty
 lengthOf
 isArray
 isObject
 isNumber
 isBoolean
 isNaN
 isNull
 isNotNull
 isUndefined
 isDefined
 isString
 isFunction
 typeOf
 instanceOf
 */


//log(SELECT(1).LIMIT(10).OFFSET(100));
//log(SELECT(1).LIMIT('10').OFFSET('100'));



//SELECT("id,status,product,name1,amount,routing,account4,reference,created").FROM("transactions")
//	.WHERE("companyid", companyid,
//	AND("product", IN([1,3,4])).OR("product", ISNULL),
//	AND("CREATED", BETWEEN(start, end))
//)
//	.GROUPBY("")
//	.ORDERBY("created DESC");
