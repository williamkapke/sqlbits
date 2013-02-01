# sqlbits
```javascript
var bits = require('sqlbits'), SELECT=bits.SELECT,BETWEEN=bits.BETWEEN;

var query =
  SELECT('id,first,last,age')
    .FROM('peeps')
    .WHERE("first=",$("Tom"), AND, "age",BETWEEN(18, 25))
    .ORDERBY('last')

console.log(query+";");
//SELECT id,first,last,age FROM peeps WHERE(first=$1 AND age BETWEEN($2 AND $3)) ORDER BY last;
console.log(query.params);
//[ 'Tom', 18, 25 ]
```
