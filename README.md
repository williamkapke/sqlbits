# sqlbits

```javascript
var bits = require('sqlbits'), $=bits.$,SELECT=bits.SELECT,BETWEEN=bits.BETWEEN,AND=bits.AND;

var query =
  SELECT('id,first,last,age')
		.FROM('peeps')
		.WHERE("first=",$("Tom"), AND, "age",BETWEEN(18, 25))
		.ORDERBY('last')

console.log(query+";");
//SELECT id,first,last,age FROM peeps WHERE(first=$1 AND age BETWEEN $2 AND $3) ORDER BY last;
console.log(query.params);
//[ 'Tom', 18, 25 ]
```

### Installation
```bash
$ npm install sqlbits
```

### The "bits"
The project is named `Sqlbits` because it aims to only provide _**bits of help**_ with building SQL query strings. 
You can use a `bit` to generate pieces of a query **or** in conjunction with other `bits` to form a complete 
query... if that's what raises your flag.

There are 3 types of `bits`: [Contexts](#contexts), [Statements](#statements), [Params](#params)

### undefined values
By design, most statements **will not** output if all associated parameters are undefined. This example omits the 
first `AND` statement because the `IN` [Param](#params) only has `undefined` values:
```javascript
var bits = require('sqlbits'),
	x, y, z;//intentionally undefined

with(bits)//GASP! OMG! ..<rant>The Crock can bite me</rant>

console.log(
	SQL(  AND("id",IN(x,y,z),  OR,"1=1")  )+""
);
//AND(1=1)
```


### Syntactic Sugar
> In computer science, syntactic sugar is syntax within a programming 
> language that is designed to make things easier to read or to express.
-[Wikipedia](http://en.wikipedia.org/wiki/Syntactic_sugar)

That's all `Sqlbits` is. No [ORM](http://en.wikipedia.org/wiki/Object-relational_mapping). No database connectivity. 
Just sugar.

Hopefully you know what SQL injection is. If not, [Google it](https://www.google.com/search?q=sql%20injection). `Sqlbits`
makes no effort to protect you from writing injectable code. It helps you manage SQL Parameters, but it is up to you to 
use them properly.

Concatenating strings with parameters isn't hard- but things can get ugly fast. Consider queries that return data 
based on different [WHERE](#conditions) conditions or [ORDER BY](#orderby) preferences. This is very common for 
reports. For example:

> "transactions for product $1, purchased between $2 & $3 for user $4"

...but these conditions need to be optional.

Concatenating a query like that (AND keeping track of the params) gets ugly. This is why `Sqlbits` omits things when 
their params are [undefined](#undefinedvalues). Here is an example that removes a peice of the `data` each time. Notice 
how the output changes.
```javascript
var bits = require('sqlbits');

function example(data){ with(bits)
	var query =
		SELECT("*").FROM("sales")
			.WHERE("product=", $(data.product),
			AND, "purchased", BETWEEN(data.start, data.end),
			AND, "userid=", $(data.userid)
		)
		.ORDERBY(data.sortby);

	console.log(query+";");
	console.log(query.params);
}

example({product:"widget",start:'01/01/2013',end:'02/01/2013',userid:6543,sortby:"purchased"});
//SELECT * FROM sales WHERE(product=$1 AND purchased BETWEEN $2 AND $3 AND userid=$4) ORDER BY purchased;
//[ 'widget', '01/01/2013', '02/01/2013', 6543 ]

example({start:'01/01/2013',end:'02/01/2013',userid:6543,sortby:"purchased"});
//SELECT * FROM sales WHERE(purchased BETWEEN $1 AND $2 AND userid=$3) ORDER BY purchased;
//[ '01/01/2013', '02/01/2013', 6543 ]

example({end:'02/01/2013',userid:6543,sortby:"purchased"});
//SELECT * FROM sales WHERE(purchased <=$1 AND userid=$2) ORDER BY purchased;
//[ '02/01/2013', 6543 ]

example({userid:6543,sortby:"purchased"});
//SELECT * FROM sales WHERE(userid=$1) ORDER BY purchased;
//[ 6543 ]

example({});
//SELECT * FROM sales;
//[]
```


### Chaining
As you've probably noticed, `Bits` are chainable with other `bits`, but no effort is made to ensure that 
the chained `bits` form logical output. For instance:
```javascript
var bits = require('sqlbits')
    SELECT = bits.SELECT;

var query = SELECT("%@!!").ORDERBY('seawead').ON('top of old smokey');

console.log(query+";");
//SELECT %@!! ORDER BY seawead ON top of old smoky;
```

Perhaps in some future world that output will be desired.

**_([string | bit] [,string | bit]...)** _(the underscore function)_

There is also a very general purpose function that is available on the context chain: `_()`. It allows you to directly 
append to the output. This provides another way to ensure that `sqlbits` are just helpers that do not restrict you.
```javascript
var bits = require('sqlbits'), SELECT = bits.SELECT;

console.log(
	SELECT('*').FROM("foo")._('LEFT OUTER JOIN bar').ON("foo.id=bar.id")._(';').sql
);
//SELECT * FROM foo LEFT OUTER JOIN bar ON foo.id=bar.id ;
```
It isn't the most beautiful syntax, but it works.



## Contexts
A `Context` object manages the `sql` output and the `params` Array for what you're doing. [Statements](#statements) 
and [Params](#params) need a `Context` to operate.

This project comes with a PostgreSQL context and output generator, [PGContext](#pgcontext), which inherits from 
the `Context` base Object. It was abstracted to allow for the possibility of other output formaters.

All Context objects will have `sql` and `params` getters.
`Context.toString()` proxies to the `sql` getter.

There are several ways to start a context. You can use the [SQL](#sql), [SELECT](#select), [INSERT.INTO](#insertinto), 
[DELETE.FROM](#deletefrom), and [UPDATE](#update) functions... or just create one with `new PGContext()`.


<a name="sql"></a>
### SQL([arg][,arg]...)
As mentioned, `sqlbits` is here to just provide help. The `SQL` function frees you from _*needing*_ other bits. 
Here is an example that uses MSSQL's `TOP N` statement which Postgres does not have...

```javascript
var bits = require('sqlbits'), SQL=bits.SQL, $=bits.$, AND=bits.AND, BETWEEN=bits.BETWEEN
n = 100;

var ctx = new bits.PGContext();
ctx.createParam = function(idx){ return '@p'+idx; };

var query = ctx.SQL("SELECT TOP ", $(n), "FROM books WHERE author LIKE 'Tom%'", AND, "rating", BETWEEN(4.4, 5));

console.log(query+";");
//SELECT TOP @p1 FROM books WHERE author LIKE 'Tom%' AND rating BETWEEN @p2 AND @p3;
console.log(query.params);
//[ 100, 4.4, 5 ]
```
> Arguments that are strings will output directly; Use caution to prevent SQL injection.



<a name="select"></a>
### SELECT([columns])
Creates a [Context](#context) that starts with a `SELECT` statement. If the columns argument is `undefined` 
the `SELECT` statement will not output.

```javascript
var bits = require('sqlbits'), SELECT=bits.SELECT;

console.log(    SELECT("foo,bar,baz")+""   );
//SELECT foo,bar,baz

console.log(    SELECT().FROM("foo")+""   );
//FROM foo
```
> The columns argument is written as-is; using a variable can lead to SQL injection.



<a name="update"></a>
### UPDATE([table])
Creates a [Context](#context) that starts with a `UPDATE` statement. If the table argument is `undefined` 
the `UPDATE` statement will not output.

```javascript
var bits = require('sqlbits'), UPDATE=bits.UPDATE,
	users;//intentionally undefined

console.log(    UPDATE("passwords")+""   );
//UPDATE passwords
```
> The table argument is written as-is; using a variable can lead to SQL injection.



<a name="deletefrom"></a>
### DELETE.FROM(table)
Creates a [Context](#context) that starts with a `DELETE FROM` statement. If the table argument is `undefined` 
the `DELETE FROM` statement will not output.

```javascript
var bits = require('sqlbits'), DELETE=bits.DELETE,
	users;//intentionally undefined

console.log(    DELETE.FROM("history")+""   );
//DELETE FROM history

console.log(    DELETE.FROM(users).WHERE("something='bad'")+""   );
//WHERE(something='bad')
```
> The table argument is written as-is; using a variable can lead to SQL injection.



<a name="insertinto"></a>
### INSERT.INTO(table, values)
Creates a [Context](#context) that starts with a `INSERT INTO` statement. If the table argument is `undefined` 
the `INSERT INTO` statement will not output.

```javascript
var bits = require('sqlbits'), INSERT=bits.INSERT, SQL=bits.SQL;

console.log(    INSERT.INTO("conversation", {at:"2013-01-23T19:09:27.793Z",text:"hi"})+""   );
//INSERT INTO conversation (at,text) VALUES ($1,$2)
```
> The table argument is written as-is; using a variable can lead to SQL injection.

If you've done batch inserts and dealt with the pain of keeping track of the params, you'll appreciate this...
```javascript
var ctx = SQL();
for(var i=0;i<5;i++)
	ctx.INSERT.INTO("things", {id:i, created:'1/1/2013'})._(';\n');

console.log(ctx.sql);
//INSERT INTO things (id,created) VALUES ($1,$2) ;
//INSERT INTO things (id,created) VALUES ($3,$2) ;
//INSERT INTO things (id,created) VALUES ($4,$2) ;
//INSERT INTO things (id,created) VALUES ($5,$2) ;
//INSERT INTO things (id,created) VALUES ($6,$2) ;

console.log(ctx.params);
//[ 0, '1/1/2013', 1, 2, 3, 4 ]
```



### PGContext
```javascript
var bits = require('sqlbits'), $=bits.$,
    ctx = new bits.PGContext();

//You can call toString() on any chain started
//off of ctx to get that portion of the sql output
console.log(  ctx.AND("1=", $(1)).toString()  );
//AND 1=$1

console.log(  ctx.AND("2=", $(33)).OR("3=", $(99)).toString()  );
// AND 2=$2 OR 3=$3

console.log(  ctx.AND("4=", $(1)).toString()  );
// AND 4=$1

//Calling toString() or ctx.sql will return the entire sql string.
console.log(ctx.sql, ctx.params);
//AND 1=$1 AND 2=$2 AND 3=$1 [ 1, 33 ]
```



## Statements

<a name="conditionals"></a>
### AND/OR/WHERE/ON([expression [,param][,bit] [,bit]...])<BR>AND/OR/WHERE/ON(bit[,bit]...)
These are considered "conditional" statements and internally use the same code. When called directly, they return a 
Statment object that can be given to a [Context](#context) or to another conditional Statement.

Calling them from a [Context](#context) chain will return the chained [Context](#context).

```javascript
var bits = require('sqlbits'), AND=bits.AND,OR=bits.OR,Statement=bits.Statement,SELECT=bits.SELECT,$=bits.$;

var stmt = AND("1=1");
console.log(stmt instanceof Statement);
//true
console.log(stmt);
//{ token: 'AND', expression: '1=1' }

//pass the OR statement to the AND statement...
console.log(AND("1=1", OR("2=2")));
//[ { token: 'AND', expression: '1=1' }, { token: 'OR', expression: '2=2' }, token: 'AND' ]


//you'll most likely want to pass it to a Context...
console.log(  SELECT("*").WHERE("1=1", AND("2=2"), OR("3=3"))+""  );
//SELECT * WHERE(1=1 AND 2=2 OR 3=3)

//if that's too many parenthesis for your eyes, you can do this...
console.log(  SELECT("*").WHERE("1=1", AND,"2=2", OR,"3=3")+""  );
//                                     ^^^--just pass the function ref
//SELECT * WHERE(1=1 AND 2=2 OR 3=3)
```
Want more parenthesis? Let's put some around those OR'd statements.
```javascript
console.log(  SELECT("*").WHERE("1=1", AND,$("2=2", OR,"3=3"))+""  );
//SELECT * WHERE(1=1 AND(2=2 OR 3=3))
```
As you can see, another use of the `$` function allows you to create a parenthesized group.



<a name="set"></a>
### SET(data)
Produces a comma separated `name=Param` pairs.
```javascript
var bits = require('sqlbits'), UPDATE=bits.UPDATE;

console.log(    UPDATE("users").SET({first:"Nic",last:"Wicks"})+""   );
//UPDATE users SET first=$1,last=$2

var data = {};
console.log(    UPDATE("users").SET(data)+""   );
//UPDATE users
```


<a name="from"></a>
### FROM(table)
The `FROM` statement simply writes "FROM table" to the output. If the table argument is not a string the statment will
not be included in the output.

```javascript
var bits = require('sqlbits'), SELECT=bits.SELECT;

console.log(    SELECT("*").FROM("books")+""   );
//SELECT * FROM books
```
> The table argument is written as-is; using a variable can lead to SQL injection.



<a name="orderby"></a>
<a name="groupby"></a>
### ORDERBY/GROUPBY([string|Param] [,string|Param]...)
Kicks out `ORDER BY` or `GROUP BY` statements. If the arguments are undefined, it will not output.

```javascript
var bits = require('sqlbits'), SQL=bits.SQL, $=bits.$;

console.log( SQL().ORDERBY("id")+"" );
//ORDER BY id

//FYI: Postgres ignores parameters in ORDER BY and GROUP BY statements
//...maybe this will change in a future version? maybe I'm wrong? (feedback pls)
console.log( SQL().ORDERBY($("id").DESC)+"" );
//ORDER BY $1 DESC
```
> The string arguments are written as-is; using variables can lead to SQL injection.



### LIMIT/OFFSET(number)
Whereas most statements will not generate output if their input is [undefined](#undefined), these default to `0`. The 
`number` argument must be a Number (passes !isNaN(number) check) or it will use `0` to help prevent accidents. 



## Params
The Param object represents a parameter in a query. When the query is generated, Param objects add their value to the 
Statement.params Array and add placeholder(s) to the output. The placeholder for Postgres is `'$'+(index+1)` (e.g. `$1`,
`$2`...). If you need something else, override the `Context.prototype.createParam` function.

[Params](#params) have ASC and DESC getters that will cause them to output ASC/DESC after the Param. Postgres ignores 
parameters in `ORDER BY` statements, but it is included so it is available for other DBs.

<a name="$"></a>
### $(value)
The `$` function will produce a Param object if a non-[Statement](#statements) is passed in.

```javascript
var bits = require('sqlbits'), $=bits.$, Param=bits.Param, SQL=bits.SQL;

console.log(  $(1) instanceof Param  );
//true

var query = SQL($(9999).DESC);
console.log(  query.sql  );
console.log(  query.params  );
//$1 DESC
//[ 9999 ]
```



<a name="in"></a>
### IN(array)<br>IN([string | Param] [,string | Param]...)
If an Array is used, all items of the array will become `Params`.

String arguments are written literally.

Duplicates and undefined values are removed. If no values remain, the statement will be omitted. If only 1 value remains, 
it will output an `equals` statement (e.g foo=$1).
```javascript
var bits = require('sqlbits'), SQL=bits.SQL, $=bits.$, IN=bits.IN,
	x,y,z;//intentionally undefined

var query = SQL().IN([8,44,21,44,56]);
console.log( query.sql );
console.log( query.params );
//IN($1,$2,$3,$4)
//[ 8, 44, 21, 56 ]

var values = [33,33,33,33,33];
console.log( SQL().WHERE("foo", IN(values))+"" );
//WHERE foo=$1

console.log( SQL().WHERE("foo", IN(x,y,z))+"" );
//empty string
```


<a name="between"></a>
### BETWEEN(min,max)
If `min` is undefied the output will use `greater than or equals` syntax.
If `max` is undefied the output will use `less than or equals` syntax.
```javascript
var bits = require('sqlbits'), SELECT=bits.SELECT, $=bits.$, BETWEEN=bits.BETWEEN,
	x;//intentionally undefined

console.log( SELECT("*").FROM("numbers").WHERE("id", BETWEEN(1,99))+"" );
//SELECT * FROM numbers WHERE id BETWEEN $1 AND $2

console.log( SELECT("*").FROM("numbers").WHERE("id", BETWEEN(1,x))+"" );
//SELECT * FROM numbers WHERE id >=$1

console.log( SELECT("*").FROM("numbers").WHERE("id", BETWEEN(x,50))+"" );
//SELECT * FROM numbers WHERE id <=$1
```


## Tests
Just run vows in the root of the project...
```bash
$ vows
```


## License
The MIT License (MIT) Copyright (c) 2013 William Wicks

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated 
documentation files (the "Software"), to deal in the Software without restriction, including without limitation 
the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, 
and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of 
the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO 
THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, 
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.




