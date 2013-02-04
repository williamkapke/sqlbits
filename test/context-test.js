
var vows = require('vows'),
	assert = require('assert'),
	bits = require('./../bits'),
	Context=bits.Context,
	PGContext=bits.PGContext,
	SQL=bits.SQL,
	FROM=bits.FROM,
	WHERE=bits.WHERE, AND=bits.AND,OR=bits.OR,
	BETWEEN=bits.BETWEEN, IN=bits.IN,
	ORDERBY=bits.ORDERBY,
	GROUPBY=bits.GROUPBY,
	LIMIT=bits.LIMIT, OFFSET=bits.OFFSET,
	Param=bits.Param,
	$=bits.$,
	x//used as an undefined value
;

vows.describe("sqltokens tests")
	.addBatch({
		"Context":{
			"construction":{
				topic: new Context(),
				"should have out and params properties": function(topic){
					assert.instanceOf(topic, Context);
					assert.isArray(topic.out);
					assert.lengthOf(topic.out, 0);
					assert.isArray(topic.params);
					assert.lengthOf(topic.params, 0);
				},
				"should have chainable 'bits'": function(topic){
					//silly check to see if something is there
					assert.isDefined(topic.LIMIT);
				}
			},
			"- sub contexts":{
				topic: new PGContext().FROM("table").WHERE("1=", $(1)).AND("don't do this=", $(true)),
				'continue param numbering and inclusion': function(topic){
					assert.equal("FROM table WHERE 1=$1 AND don't do this=$2", topic.sql);
					assert.lengthOf(topic.params, 2);
				}
			}
		},
		"SQL": {
			"return value": {
				topic: SQL(),
				"should be a Context": function(topic){
					assert.instanceOf(topic, Context);
				}
			},
			"with a string arg": {
				topic: SQL("SELECT 1"),
				'should output the string': function(topic){
					assert.equal("SELECT 1", topic.sql);
					assert.isEmpty(topic.params);
				}
			},
			"with a param arg": {
				topic: SQL("SELECT foo=", $(99)),
				'should output the $param': function(topic){
					assert.equal("SELECT foo=$1", topic.sql);
				},
				'should add it to the params list': function(topic){
					assert.lengthOf(topic.params, 1);
					assert.equal(topic.params[0], 99);
				}
			},
			"when the variable is undefined":	{
				topic: SQL($(x)),
				'should return an empty string and should\'t add the param': function(topic){
					assert.equal("", topic.sql);
					assert.lengthOf(topic.params, 0);
				}
			},
			BOOKEND:{}
		},
		"IN": {
			"passing an array": {
				topic: SQL(IN([1,2,3])),
				'should output an IN statement and add the parameters': function(topic){
					assert.equal("IN($1,$2,$3)", topic.sql);
					assert.lengthOf(topic.params, 3);
				}
			},
			"multiple undefined values": {
				topic: SQL(IN([x,x,x])),
				"with only 1 param which is undefined": {
					topic: IN(undefined),
					'should return Param': function(topic){
						assert.instanceOf(topic, Param);
					},
					'shouldn\'t have Param.v': function(topic){
						assert.isUndefined(topic.v);
					}
				}
			},
			"with several parameters": {
				topic: SQL(
					IN( $(1), $(2) )
				),
				'should output an IN statement and add the parameters': function(topic){
					assert.equal("IN($1,$2)", topic.sql);
				},
				"should add the params":function(topic){
					assert.lengthOf(topic.params, 2);
				}
			},
			"additional statements": {
				topic: SQL(IN($(5),"8",$(7)), IN("6",$(5),"4")),
				'should continue param numbering': function(topic){
					assert.equal("IN($1,8,$2) IN(6,$1,4)", topic.sql);
				},
				"should add the params without duplicates":function(topic){
					assert.lengthOf(topic.params, 2);
				}
			},
			"duplicate params": {
				topic: SQL(IN($(5), $(5), [5])),
				'should be removed': function(topic){
					assert.equal(topic.sql, "=$1");
					assert.lengthOf(topic.params, 1);
					assert.equal(5, topic.params[0]);
				}
			},
			BOOKEND:{}
		},
		"BETWEEN": {
			"passing a min & max": {
				topic: SQL(BETWEEN(1,2)),
				'should output "BETWEEN(min AND max)"': function(topic){
					assert.equal("BETWEEN $1 AND $2", topic.sql);
				},
				'should contribute 2 params': function(topic){
					assert.lengthOf(topic.params, 2);
				}
			},
			"passing only a min": {
				topic: SQL(BETWEEN(1)),
				'should output ">=min"': function(topic){
					assert.equal(">=$1", topic.sql);
				},
				'should contribute 1 param': function(topic){
					assert.lengthOf(topic.params, 1);
					assert.equal(topic.params[0], 1);
				}
			},
			"passing only a max": {
				topic: SQL(BETWEEN(undefined, 1)),
				'should output "<=max"': function(topic){
					assert.equal("<=$1", topic.sql);
				},
				'should contribute 1 param': function(topic){
					assert.lengthOf(topic.params, 1);
					assert.equal(topic.params[0], 1);
				}
			},
			"additional statements": {
				topic: SQL(BETWEEN($(0),$(1)), BETWEEN(800, "900")),
				'should continue param numbering': function(topic){
					assert.equal("BETWEEN $1 AND $2 BETWEEN $3 AND $4", topic.sql);
					assert.lengthOf(topic.params, 4);
				}
			},
			BOOKEND:{}
		},
		"WHERE/AND/OR": {//internally uses the same code
			"with a single parameter": {
				topic: SQL(AND("1=1")),
				'should output the single expression': function(topic){
					assert.equal("AND 1=1", topic.sql);
				}
			},
			"with a param": {
				topic: SQL(AND("1=", $(0))),
				'should output the expression and the $param': function(topic){
					assert.equal("AND 1=$1", topic.sql);
				},
				'should add the param': function(topic){
					assert.lengthOf(topic.params, 1);
				}
			},
			"when param references something undefined":	{
				topic: SQL(AND("foo=", $(x))),
				'the output should be empty': function(topic){
					assert.equal("", topic.sql);
				},
				'it shouldn\'t contribute any params': function(topic){
					assert.isEmpty(topic.params);
				}
			},
			"when the 2nd arg is a Statement that doesn't yield a result":	{
				topic: SQL(AND("foo", IN($(x),$(x)))),
				'the output should be empty': function(topic){
					assert.equal("", topic.sql);
				},
				'it shouldn\'t contribute any params': function(topic){
					assert.isEmpty(topic.params);
				}
			},
			"with a grouped condition":	{
				topic: SQL(AND("1=", $(1), OR("2=2"))),
				'should output a parenthesized condition': function(topic){
					assert.equal("AND(1=$1 OR 2=2)", topic.sql);
				},
				'that doesn\'t output': {
					topic: SQL(AND("1=",$(1), OR("2=", $(x)) )),
					'should not output parens': function(topic){
						assert.equal("AND 1=$1", topic.sql);
					}
				}
			},
			"additional condition statements": {
				topic: SQL(AND("1=",$(99), OR("2=", $(2)), OR("2=", $(99)))),
				'should continue param numbering or reuse a param that has the same value': function(topic){
					assert.equal("AND(1=$1 OR 2=$2 OR 2=$1)", topic.sql);
					assert.lengthOf(topic.params, 2);
				}
			},
			"arguments that are sql 'bits'": {
				topic: SQL(AND("1=1", OR, "2=2", OR, "3=", $(3))),
				'should consume the next argument(s) and work as if it was called as a function': function(topic){
					assert.equal("AND(1=1 OR 2=2 OR 3=$1)", topic.sql);
//					assert.lengthOf(topic.params, 2);
				}
			},
			'when the initial condition is ignored but the chained conditions are not': {
				topic: SQL(AND("foo=",$(x), OR("1=", $(1)), OR("2=2"), AND("3=", $(99)), AND("4=", $(4)))),
				'it should retain the initial condition type and output the chain': function(topic){
					assert.equal("AND(1=$1 OR 2=2 AND 3=$2 AND 4=$3)", topic.sql);
					assert.lengthOf(topic.params, 3);
				}
			},
			"with an expression": {
				"(WHERE)": {
					topic: SQL(WHERE("1=1")),
					'should output the statement with the expression': function(topic){
						assert.equal("WHERE 1=1", topic.sql);
					}
				},
				"(AND)": {
					topic: SQL(AND("1=1")),
					'should output the statement with the expression': function(topic){
						assert.equal("AND 1=1", topic.sql);
					}
				},
				"(OR)": {
					topic: SQL(OR("1=1")),
					'should output the statement with the expression': function(topic){
						assert.equal("OR 1=1", topic.sql);
					}
				}
			},
			BOOKEND:{}
		},
		"Sub-Contexts:":{
			topic: new PGContext(),
			"individual statements called on the context": {
				topic: function(ctx){
					return [
						ctx.SELECT("id"),
						ctx.AND("1=1", AND, "2=2")
					];
				},
				"should have their own output": function(topic){
					assert.equal("SELECT id", topic[0].toString());
					assert.equal(" AND(1=1 AND 2=2)", topic[1].toString());
				}
			}
		},
		"FROM": {
			"with the table supplied": {
				topic: SQL(FROM("customers")),
				'should output the statement with the table': function(topic){
					assert.equal("FROM customers", topic.sql);
				}
			}
		},
		"ORDERBY/GROUPBY": {//internally uses the same code
			"with a string arg": {
				topic: SQL(GROUPBY("id")),
				'should output the statement with the column': function(topic){
					assert.equal("GROUP BY id", topic.sql);
				}
			},
			"with a Param arg": {
				topic: SQL(GROUPBY($("id"))),
				'should output the statement with the Param': function(topic){
					assert.equal("GROUP BY $1", topic.sql);
				}
			},
			"with a string and a Param arg": {
				topic: SQL(GROUPBY("date",$("id"))),
				'should output the string inline and then the Param': function(topic){
					assert.equal("GROUP BY date,$1", topic.sql);
				}
			},
			"with ASC/DESC": {
				topic: SQL(ORDERBY("id", $("date").DESC, $("first").ASC)),
				'should append DESC after the Param': function(topic){
					assert.equal("ORDER BY id,$1 DESC,$2 ASC", topic.sql);
				}
			},
			"with an Array arg": {
				topic: SQL(GROUPBY([$("id"), "date"])),
				'should output all Param items': function(topic){
					assert.equal("GROUP BY $1,$2", topic.sql);
				}
			},
			BOOKEND:{}
		},
		"LIMIT/OFFSET": {//internally uses the same code
			"with the expression": {
				"(LIMIT)": {
					topic: SQL(LIMIT(100)),
					'should output the statement with the expression': function(topic){
						assert.equal("LIMIT 100", topic.sql);
					}
				},
				"(OFFSET)": {
					topic: SQL(OFFSET(99)),
					'should output the statement with the expression': function(topic){
						assert.equal("OFFSET 99", topic.sql);
					}
				}
			},
			"with a non-number arg":{
				topic: SQL(LIMIT("sleepy dogs")),
				'should default to 0': function(topic){
					assert.equal("LIMIT 0", topic.sql);
				}
			},
			BOOKEND:{}
		},
		BOOKEND:{}
	})
	.export(module);
//	.run();

/* For ref:

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

