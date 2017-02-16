// Copyright (c) 2016-present, salesforce.com, inc. All rights reserved
// Licensed under BSD 3-Clause - see LICENSE.txt or git.io/sfdc-license

'use strict'

const _ = require('lodash')
const { parse: createAST } = require('scss-parser/lib')

const createQuery = require('../lib')

let cleanNode = (node) => {
  let clone = _.pick(_.clone(node), ['type', 'value'])
  clone.value = _.isArray(clone.value)
    ? clone.value.map(cleanNode) : clone.value
  return clone
}

let getAST = (scss) => {
  let ast = cleanNode(createAST(scss))
  let $ = createQuery(ast)
  return { ast, $ }
}

module.exports = { getAST }
