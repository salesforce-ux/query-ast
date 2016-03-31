# QueryAST

[![Build Status](https://travis-ci.org/salesforce-ux/query-ast.svg?branch=master)](https://travis-ci.org/salesforce-ux/query-ast)

A library to traverse/modify an AST

## Documentation

Read the [API documentation](https://salesforce-ux.github.io/query-ast)

## Usage

QueryAST aims to provide a jQuery like API for traversing an AST.

```javascript
// Create a function that will be used to traverse/modify an AST
let $ = require('query-ast')(ast, options)
// Make some modifications
$().find('item').remove()
// Return the modified AST
$().get(0)
```

### Default format

By default, QueryAST assumes that an AST will be formatted as a node tree
where each node has a `type` key and a `value` key that either contains the
string value of the node or an array of child nodes.

```javascript
let ast = {
  type: 'program',
  value: [{
    type: 'item',
    value: 'a'
  }]
}
```

## Alternate formats

Not every AST follows the same format, so QueryAST also provides a way
to traverse any tree structure. Below are the default options used to
handle the above AST structure.

```
let options = {
  /**
   * Return true if the node has children
   *
   * @param {object} node
   * @returns {boolean}
   */
  hasChildren: (node) => Array.isArray(node.value),
  /**
   * Return an array of child nodes
   *
   * @param {object} node
   * @returns {object[]}
   */
  getChildren: (node) => node.value,
  /**
   * Return a string representation of the node's type
   *
   * @param {object} node
   * @returns {string}
   */
  getType: (node) => node.type,
  /**
   * Convert the node back to JSON. This usually just means merging the
   * children back into the node
   *
   * @param {object} node
   * @param {object[]} [children]
   * @returns {string}
   */
  toJSON: (node, children) => {
    return Object.assign({}, node, {
      value: children ? children : node.value
    })
  },
  /**
   * Convert the node to a string
   *
   * @param {object} node
   * @returns {string}
   */
  toString: (node) => {
    return typeof node.value === 'string' ? node.value : ''
  }
}
```

## Running tests

Clone the repository, then:

```bash
npm install
# requires node >= 5.0.0
npm test
```

## Generate Documentation

```bash
npm run doc
```
