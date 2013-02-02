
var vows = require('vows'),
	assert = require('assert'),
	bits = require('./../sqlbits'),
	Empty=bits.Empty,
	FROM=bits.FROM,
	WHERE=bits.WHERE, AND=bits.AND,OR=bits.OR,
	BETWEEN=bits.BETWEEN, IN=bits.IN,
	ORDERBY=bits.ORDERBY,
	GROUPBY=bits.GROUPBY,
	LIMIT=bits.LIMIT, OFFSET=bits.OFFSET,
	Param=bits.Param,
	Statement=bits.Statement,
	$=bits.$,
	x//used as an undefined value
;

vows.describe("sqltokens tests")
	.addBatch({
		"parameters": {
			"$ with no args": {
				topic: $(),
				'should return Param': function(topic){
					assert.instanceOf(topic, Param);
				},
				'shouldn\'t have Param.v': function(topic){
					assert.isUndefined(topic.v);
				}
			},
			"$ with one arg that is undefined": {
				topic: $(undefined),
				'should return aaram': function(topic){
					assert.instanceOf(topic, Param);
				},
				'should have Param.v': function(topic){
					assert.isUndefined(topic.v);
				}
			},
			"$ with one arg": {
				topic: $(99),
				'should return Param': function(topic){
					assert.instanceOf(topic, Param);
				},
				'should have Param.v': function(topic){
					assert.isDefined(topic, "v");
				},
				'should contain the value': function(topic){
					assert.equal(topic.v, 99);
				}
			},
			BOOKEND:{}
		},
		"IN": {
			"with no parameters": {
				topic: IN(),
				'should return Param': function(topic){
					assert.instanceOf(topic, Param);
				},
				'shouldn\'t have Param.v': function(topic){
					assert.isUndefined(topic.v);
				}
			},
			"with []": {
				topic: IN([]),
				'should return Param': function(topic){
					assert.instanceOf(topic, Param);
				},
				'shouldn\'t have Param.v': function(topic){
					assert.isUndefined(topic.v);
				}
			},
			"with [undefined]": {
				topic: IN([undefined]),
				'should return Param': function(topic){
					assert.instanceOf(topic, Param);
				},
				'shouldn\'t have Param.v': function(topic){
					assert.isUndefined(topic.v);
				}
			},
			"with only 1 param which is undefined": {
				topic: IN(undefined),
				'should return Param': function(topic){
					assert.instanceOf(topic, Param);
				},
				'shouldn\'t have Param.v': function(topic){
					assert.isUndefined(topic.v);
				}
			},
			"with only 1 arg": {
				topic: IN('1,2,3'),
				'Param.v should be an array with the length of 1': function(topic){
					assert.isArray(topic.v);
					assert.lengthOf(topic.v, 1);
				},
				'Param.v[0] should be the arg': function(topic){
					assert.isArray(topic.v);
					assert.equal(topic.v[0], '1,2,3');
				}
			},
			"with only 1 arg that is a Param": {
				topic: IN($(1)),
				'Param.v should be an array with the length of 1': function(topic){
					assert.isArray(topic.v);
					assert.lengthOf(topic.v, 1);
				},
				'Param.v[0] should be the Param': function(topic){
					assert.isArray(topic.v);
					assert.instanceOf(topic.v[0], Param);
				}
			},
			"passing an array": {
				topic: IN([1,2,3]),
				'Param.v should contain Params for each item': function(topic){
					assert.isArray(topic.v);
					assert.lengthOf(topic.v, 3);
					topic.v.forEach(function(p){
						assert.instanceOf(p, Param);
					});
				}
			},
			"multiple undefined values": {
				topic: IN([x,x,x]),
				'should return Param': function(topic){
					assert.instanceOf(topic, Param);
				},
				'shouldn\'t have Param.v': function(topic){
					assert.isUndefined(topic.v);
				}
			},
			"with several parameters": {
				topic: IN( $(1), $(2) ),
				'Param.v should contain Params for each item': function(topic){
					assert.isArray(topic.v);
					assert.lengthOf(topic.v, 2);
					topic.v.forEach(function(p){
						assert.instanceOf(p, Param);
					});
				}
			},
			BOOKEND:{}
		},
		"BETWEEN": {
			"with no parameters": {
				topic: BETWEEN(),
				'should return Param': function(topic){
					assert.instanceOf(topic, Param);
				},
				'shouldn\'t have Param.v': function(topic){
					assert.isUndefined(topic.v);
				}
			},
			"with undefined args": {
				topic: BETWEEN(undefined),
				'should return Param': function(topic){
					assert.instanceOf(topic, Param);
				},
				'shouldn\'t have Param.v': function(topic){
					assert.isUndefined(topic.v);
				}
			},
			"passing a min & max": {
				topic: BETWEEN(1,2),
				'Param.v should hold [min,max]': function(topic){
					assert.isArray(topic.v);
					assert.instanceOf(topic.v[0], Param);
					assert.instanceOf(topic.v[1], Param);
					assert.equal(topic.v[0].v, 1);
					assert.equal(topic.v[1].v, 2);
				}
			},
			"passing only a min": {
				topic: BETWEEN(1),
				'Param.v should hold [min]': function(topic){
					assert.isArray(topic.v);
					assert.instanceOf(topic.v[0], Param);
					assert.isUndefined(topic.v[1].v);
					assert.equal(topic.v[0].v, 1);
				}
			},
			"passing only a max": {
				topic: BETWEEN(undefined, 2),
				'Param.v should hold [,max]': function(topic){
					assert.isArray(topic.v);
					assert.isUndefined(topic.v[0].v);
					assert.instanceOf(topic.v[1], Param);
					assert.equal(topic.v[1].v, 2);
				}
			},
			BOOKEND:{}
		},
		"WHERE/AND/OR": {//internally uses the same code
			"with no parameters": {
				topic: AND(),
				'should return Empty': function(topic){
					assert.equal(Empty, topic);
				}
			},
			"with a single parameter": {
				topic: AND("1=1"),
				'should output a Statement with the single expression': function(topic){
					assert.instanceOf(topic, Statement);
					assert.deepEqual({ token: 'AND', expression: '1=1' }, topic);
				}
			},
			"when valid for output": {
				"(WHERE)": {
					topic: WHERE("1=1"),
					'should have a "WHERE" token': function(topic){
						assert.equal("WHERE", topic.token);
					}
				},
				"(AND)": {
					topic: AND("1=1"),
					'should have an "AND" token': function(topic){
						assert.equal("AND", topic.token);
					}
				},
				"(OR)": {
					topic: OR("1=1"),
					'should have an "OR" token': function(topic){
						assert.equal("OR", topic.token);
					}
				}
			},
			"with a param": {
				topic: AND("1=", $(0)),
				'should output a Statement with the expression and the $param': function(topic){
					assert.deepEqual({ token: 'AND', expression: '1=', param: {v:0} }, topic);
				}
			},
			"when param references something undefined":	{
				topic: AND("foo=", $(x)),
				'the Statement should be Empty': function(topic){
					assert.equal(Empty, topic);
				}
			},
			"when the 2nd arg is a Param that doesn't yield a result":	{
				topic: AND("foo", IN($(x),$(x))),
				'the Statement should be Empty': function(topic){
					assert.equal(Empty, topic);
				}
			},
			"with a grouped condition":	{
				topic: AND("1=", $(1), OR("2=2")),
				'should output a group array': function(topic){
					assert.isArray(topic);
					assert.lengthOf(topic, 2);
					assert.deepEqual(topic[0], { token: 'AND', expression: '1=', param: { v: 1 } });
					assert.deepEqual(topic[1], { token: 'OR', expression: '2=2' });
					assert.equal('AND', topic.token);
				}
			},
			BOOKEND:{}
		},
		"FROM/ORDERBY/GROUPBY": {//internally uses the same code
			"with no parameters": {
				topic: FROM(),
				'should return Empty': function(topic){
					assert.equal(Empty, topic);
				}
			},
			"with undefined args": {
				topic: FROM(undefined),
				'should return Empty': function(topic){
					assert.equal(Empty, topic);
				}
			},
			"when valid for output": {
				"(FROM)": {
					topic: FROM("customers"),
					'should have a "FROM" token': function(topic){
						assert.equal("FROM", topic.token);
					}
				},
				"(ORDERBY)": {
					topic: ORDERBY("id"),
					'should have an "ORDERBY" token': function(topic){
						assert.equal("ORDERBY", topic.token);
					}
				},
				"(GROUPBY)": {
					topic: GROUPBY("id"),
					'should have a "GROUPBY" token': function(topic){
						assert.equal("GROUPBY", topic.token);
					}
				}
			},
			BOOKEND:{}
		},
		"LIMIT/OFFSET": {//internally uses the same code
			"with no parameters": {
				topic: LIMIT(),
				'should return 0': function(topic){
					assert.equal("0", topic.expression);
				}
			},
			"with undefined args": {
				topic: OFFSET(undefined),
				'should return 0': function(topic){
					assert.equal("0", topic.expression);
				}
			},
			"with the expression": {
				"(LIMIT)": {
					topic: LIMIT(100),
					'should have a "LIMIT" token': function(topic){
						assert.equal("LIMIT", topic.token);
					}
				},
				"(OFFSET)": {
					topic: OFFSET(99),
					'should have an "OFFSET" token': function(topic){
						assert.equal("OFFSET", topic.token);
					}
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

