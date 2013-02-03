
var vows = require('vows'),
	assert = require('assert'),
	bits = require('./../bits'),
	SELECT=bits.SELECT,
	DELETE=bits.DELETE,
	x//used as an undefined value
;

vows.describe("SELECT tests")
	.addBatch({
		"SELECT": {
			"return value": {
				topic: SELECT(),
				'should be a Context': function(topic){
					assert.instanceOf(topic, bits.Context);
					assert.instanceOf(topic, bits.PGContext);
				}
			},
			"with columns": {
				topic: SELECT('*'),
				'should output the select statement with the columns': function(topic){
					assert.equal("SELECT *", topic.toString());
					assert.lengthOf(topic.params, 0);
				}
			},
			"when the columns argument is not a string": {
				topic: SELECT(1),
				'it should not output': function(topic){
					assert.equal("", topic.toString());
					assert.lengthOf(topic.params, 0);
				}
			},
			"chained tokens":	{
				topic: SELECT("id").FROM("customers"),
				'should append output': function(topic){
					assert.equal(topic.toString(), "SELECT id FROM customers");
					assert.lengthOf(topic.params, 0);
				},
				"that are skipped": {
					topic: SELECT("1=1").FROM(x),
					"should not modify output": function(topic){
						assert.equal(topic.toString(), "SELECT 1=1");
						assert.lengthOf(topic.params, 0);
					}
				}
			},
			BOOKEND:{}
		},
		"DELETE FORM": {
			"without a table":{
				topic: DELETE.FROM(),
				"should be a context":function(topic){
					assert.instanceOf(topic, bits.Context);
					assert.instanceOf(topic, bits.PGContext);
				}
			},
			"with a table specified":{
				topic: DELETE.FROM("history"),
				"should output the statement with the table":function(topic){
					assert.equal("DELETE FROM history", topic.toString());
				}
			},
			"with an undefined table and a chain":{
				topic: DELETE.FROM(x).WHERE("something='bad'"),
				"should output the statement with the table":function(topic){
					assert.equal("WHERE something='bad'", topic.toString());
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
