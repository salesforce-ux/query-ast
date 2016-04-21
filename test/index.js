/*
Copyright (c) 2015, salesforce.com, inc. All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
Neither the name of salesforce.com, inc. nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

/* global describe, it */

'use strict'

const { expect } = require('chai')

const createQuery = require('../lib')
const { createAST } = require('../../scss-parser/test/helpers')

let getType = (n) => n.type
let getValue = (n) => n.value

let getAST = (scss) => {
  let ast = createAST(scss)
  let $ = createQuery(ast)
  return { ast, $ }
}

describe('#createQuery(ast, options)', () => {
  describe('ast', () => {
    it('throws an error if no AST is provided', () => {
      expect(() => {
        createQuery()
      }).to.throw(/object/)
    })
  })
  describe('options', () => {
    it('throws an error if hasChildren is not a function', () => {
      expect(() => {
        createQuery({}, {
          hasChildren: true
        })
      }).to.throw(/hasChildren/)
    })
    it('throws an error if getChildren is not a function', () => {
      expect(() => {
        createQuery({}, {
          getChildren: true
        })
      }).to.throw(/getChildren/)
    })
    it('throws an error if getType is not a function', () => {
      expect(() => {
        createQuery({}, {
          getType: true
        })
      }).to.throw(/getType/)
    })
    it('throws an error if toJSON is not a function', () => {
      expect(() => {
        createQuery({}, {
          toJSON: true
        })
      }).to.throw(/toJSON/)
    })
    it('throws an error if toString is not a function', () => {
      expect(() => {
        createQuery({}, {
          toString: true
        })
      }).to.throw(/toString/)
    })
  })
})

describe('$', () => {
  describe('#get', () => {
    it('returns the the nodes as JSON', () => {
      let { $ } = getAST(`
        $border: 1px 2px 3px;
      `)
      let numbers = $('number').get()
      expect(Array.isArray(numbers)).to.be.true
      expect(numbers).to.have.length(3)
      expect(numbers.map(getValue)).to.deep.equal(['1', '2', '3'])
    })
    it('returns a single node as JSON', () => {
      let { $ } = getAST(`
        $border: 1px 2px 3px;
      `)
      let numbers = $().find('number').get(1)
      expect(numbers.value).to.deep.equal('2')
    })
  })
  describe('#length', () => {
    it('returns length of the current selection', () => {
      let { $ } = getAST(`
        $border: 1px 2px 3px;
      `)
      let numbers = $('number')
      expect(numbers.length()).to.equal(3)
    })
  })
  describe('#index', () => {
    it('returns the index of the first item in the selection based on its siblings', () => {
      let { $ } = getAST(`
        .r { color: $_r; }
        .g { color: #{$_g}; }
        .b { color: $_b; }
      `)
      let index = $('rule')
        .eq(1)
        .index()
      // This is matching against siblings (whitespace included)
      expect(index).to.equal(3)
    })
    it('returns the index of the first item in the selection that matches the selector', () => {
      let { $ } = getAST(`
        $background: #fff #ccc #000;
      `)
      let $node = $()
      let $gray = $node.find('value').first().children().eq(3)
      let index = $gray.index('color_hex')
      expect(index).to.equal(1)
    })
  })
  describe('#after', () => {
    it('inserts a node after', () => {
      let { $ } = getAST(`
        .r { color: $_r; }
        .g { color: $_g; }
        .b { color: $_b; }
      `)
      $('rule')
        .eq(1)
        .after(
          createAST('.z { color: $_z; }').value[0]
        )
      expect($().find('class').value()).to.equal('rgzb')
    })
  })
  describe('#before', () => {
    it('inserts a node after', () => {
      let { $ } = getAST(`
        .r { color: $_r; }
        .g { color: $_g; }
        .b { color: $_b; }
      `)
      $('rule')
        .eq(0)
        .before(
          createAST('.z { color: $_z; }').value[0]
        )
      expect($().find('class').value()).to.equal('zrgb')
    })
  })
  describe('#remove', () => {
    it('removes a node', () => {
      let { $ } = getAST(`
        .r { color: $_r; }
        .g { color: $_g; }
        .b { color: $_b; }
      `)
      let rulesBefore = $('rule').get()
      $('rule').eq(1).remove()
      let rulesAfter = $('rule').get()
      expect(rulesAfter).to.deep.equal([rulesBefore[0], rulesBefore[2]])
    })
  })
  describe('#map', () => {
    it('works', () => {
      let { $ } = getAST(`
        $border: 1px 2px 3px;
      `)
      let numbers = $('number').map((n) => {
        return $(n).value()
      })
      expect(numbers).to.deep.equal(['1', '2', '3'])
    })
  })
  describe('#reduce', () => {
    it('works', () => {
      let { $ } = getAST(`
        $border: 1px 2px 3px;
      `)
      let numbers = $('number').reduce((acc, n) => {
        return acc + $(n).value()
      }, '')
      expect(numbers).to.deep.equal('123')
    })
  })
  describe('#replace', () => {
    it('removes a node', () => {
      let { $ } = getAST(`
        $border: 1px 2px 3px;
      `)
      $('number').first().replace((n) => {
        return { type: 'number', value: '8' }
      })
      expect($().find('number').first().value()).to.equal('8')
    })
  })
  describe('#children', () => {
    it('returns direct children of a node', () => {
      let { $ } = getAST(`
        $border: 1px 2px 3px;
      `)
      let children = $()
        .find('value')
        .children()
      expect(children.length()).to.equal(9)
    })
    it('returns direct children of multiple nodes', () => {
      let { $ } = getAST(`
        $borderA: 1px 2px 3px;
        $borderB: 4px 5px 6px;
      `)
      let children = $()
        .find('value')
        .children()
      expect(children.length()).to.equal(18)
    })
    it('returns direct children of multiple nodes filterd by a selector', () => {
      let { $ } = getAST(`
        $borderA: 1px 2px 3px;
        $borderB: 4px 5px 6px;
      `)
      let children = $()
        .find('value')
        .children('number')
      expect(children.length()).to.equal(6)
    })
  })
  describe('#closest', () => {
    it('works', () => {
      let { $ } = getAST(`
        .r { color: $_r; }
      `)
      let blocks = $()
        .find('variable')
        .closest('block')
        .get()
      let block = $().find('block').get(0)
      expect(blocks).to.deep.equal([block])
    })
  })
  describe('#eq', () => {
    it('selects the node at the specified index', () => {
      let { $ } = getAST(`
        .r { color: $_r; }
        .g { color: $_g; }
        .b { color: $_b; }
      `)
      let className = $()
        .find('rule')
        .eq(1)
        .find('class')
        .value()
      expect(className).to.equal('g')
    })
  })
  describe('#find', () => {
    it('selects all nodes matching a type', () => {
      let { $ } = getAST(`
        .r { color: $_r; }
      `)
      let variables = $()
        .find('variable')
        .get()
      expect(variables.map(getValue)).to.deep.equal(['_r'])
    })
    it('selects based on the previous selection', () => {
      let { $ } = getAST(`
        $hello: world;
        .b { color: $_b; }
        .g { color: $_g; }
      `)
      let variables = $()
        .find('rule')
        .find('variable')
        .get()
      expect(variables.map(getValue)).to.deep.equal(['_b', '_g'])
    })
  })
  describe('#filter', () => {
    it('filters a selection', () => {
      let { $ } = getAST(`
        .r { color: $_r; }
        .g { color: $_g; }
        .b { color: $_b; }
      `)
      let className = $()
        .find('class')
        .filter((n) => $(n).value() === 'g')
        .value()
      expect(className).to.equal('g')
    })
    it('filters a selection inverse', () => {
      let { $ } = getAST(`
        .r { color: $_r; }
        .g { color: $_g; }
        .b { color: $_b; }
      `)
      let notSpaces = $()
        .children()
        .filter((n) => n.node.type !== 'space')
      expect(notSpaces.length()).to.equal(3)
    })
  })
  describe('#first', () => {
    it('selects the first item in a selection', () => {
      let { $ } = getAST(`
        .r { color: $_r; }
        .g { color: $_g; }
        .b { color: $_b; }
      `)
      let actual = $()
        .find('class')
        .first()
      expect(actual.get()).to.have.length(1)
      expect(actual.value()).to.equal('r')
    })
  })
  describe('#has', () => {
    it('filters a selection to those that have a descendant that match the selector', () => {
      let { $ } = getAST(`
        .r { color: $_r; }
        .g { color: #{$_g}; }
        .b { color: $_b; }
      `)
      let rules = $()
        .find('rule')
      let rulesInterpolation = $()
        .find('rule')
        .has('interpolation')
      expect(rulesInterpolation.length()).to.equal(1)
      expect(rulesInterpolation.get(0)).to.deep.equal(rules.get(1))
    })
  })
  describe('#hasParent', () => {
    it('filters a selection to those that have a descendant that match the selector', () => {
      let { $ } = getAST(`
        .r { color: $_r; }
        .g { color: #{$_g}; }
        .b { color: $_b; }
      `)
      let variables = $()
        .find('variable')
      let variablesInterpolation = variables.hasParent('interpolation')
      expect(variablesInterpolation.length()).to.equal(1)
      expect(variablesInterpolation.get(0)).to.deep.equal(variables.get(1))
    })
  })
  describe('#hasParents', () => {
    it('filters a selection to those that have a descendant that match the selector', () => {
      let { $ } = getAST(`
        .r { color: $_r; }
        .g { color: #{$_g}; }
        .b { color: $_b; }
      `)
      let variables = $()
        .find('variable')
      let variablesInsideG = variables.hasParents((n) => {
        return n.node.type === 'rule' && $(n).has((n) => {
          return n.node.type === 'class' && $(n).value() === 'g'
        }).length()
      })
      expect(variablesInsideG.length()).to.equal(1)
      expect(variablesInsideG.get(0)).to.deep.equal(variables.get(1))
    })
  })
  describe('#last', () => {
    it('selects the last item in a selection', () => {
      let { $ } = getAST(`
        .r { color: $_r; }
        .g { color: $_g; }
        .b { color: $_b; }
      `)
      let classes = $()
        .find('class')
        .last()
      expect(classes.get()).to.have.length(1)
      expect(classes.value()).to.equal('b')
    })
  })
  describe('#next', () => {
    it('selects the next sibling for each item in the selection', () => {
      let { $ } = getAST(`
        .r { color: $_r; }
        .g { color: $_g; }
        .b { color: $_b; }
      `)
      let node = $()
        .find('rule')
        .eq(1) // .g
        .next() // space
        .next() // .b
      expect(node.find('class').value()).to.equal('b')
    })
    it('optionally filters selection', () => {
      let { $ } = getAST(`
        .r { color: $_r; }
        .g { color: $_g; }
        .b { color: $_b; }
      `)
      let node = $()
        .find('rule')
        .eq(1)
        .next('rule')
      // a "space" node is the next node
      expect(node.length()).to.equal(0)
    })
  })
  describe('#nextAll', () => {
    it('selects the next sibling for each item in the selection', () => {
      let { $ } = getAST(`
        .r { color: $_r; }
        .g { color: $_g; }
        .b { color: $_b; }
      `)
      let nodes = $()
        .find('rule')
        .eq(1)
        .nextAll()
        .get()
      expect(nodes.map(getType)).to.deep.equal(['space', 'rule', 'space'])
    })
    it('optionally filters selection', () => {
      let { $ } = getAST(`
        .r { color: $_r; }
        .g { color: $_g; }
        .b { color: $_b; }
      `)
      let nodes = $()
        .find('rule')
        .eq(0)
        .nextAll('rule')
        .find('class')
      expect(nodes.map((n) => $(n).value())).to.deep.equal(['g', 'b'])
    })
  })
  describe('#parent', () => {
    it('works', () => {
      let { $ } = getAST(`
        @mixin myMixin ($a) {}
        .r { color: $_r; }
        .g { color: $_g; }
        .b { color: $_b; }
      `)
      let parents = $()
        .find('variable')
        .parent()
        .get()
      expect(parents.map(getType)).to.deep.equal([
        'arguments', 'value', 'value', 'value'
      ])
    })
    it('optionally filters selection', () => {
      let { $ } = getAST(`
        @mixin myMixin ($a) {}
        .r { color: $_r; }
        .g { color: $_g; }
        .b { color: $_b; }
      `)
      let parents = $()
        .find('variable')
        .parent('arguments')
        .get()
      expect(parents.map(getType)).to.deep.equal(['arguments'])
    })
  })
  describe('#parents', () => {
    it('works', () => {
      let { $ } = getAST(`
        .r { color: $_r; }
      `)
      let parents = $()
        .find('variable')
        .parents()
        .get()
      expect(parents.map(getType)).to.deep.equal([
        'value', 'declaration', 'block', 'rule', 'stylesheet'
      ])
    })
    it('optionally filters selection', () => {
      let { $ } = getAST(`
        .r { color: $_r; }
      `)
      let parents = $()
        .find('variable')
        .parents('rule')
        .get()
      expect(parents.map(getType)).to.deep.equal(['rule'])
    })
  })
  describe('#parentsUntil', () => {
    it('works', () => {
      let { $ } = getAST(`
        .r { color: $_r; }
      `)
      let parents = $()
        .find('variable')
        .parentsUntil('rule')
        .get()
      expect(parents.map(getType)).to.deep.equal([
        'value', 'declaration', 'block'
      ])
    })
  })
  describe('#prev', () => {
    it('selects the previous sibling for each item in the selection', () => {
      let { $ } = getAST(`
        .r { color: $_r; }
        .g { color: $_g; }
        .b { color: $_b; }
      `)
      let node = $()
        .find('rule')
        .eq(1) // .g
        .prev() // space
        .prev() // .r
      expect(node.find('class').value()).to.equal('r')
    })
    it('optionally filters selection', () => {
      let { $ } = getAST(`
        .r { color: $_r; }
        .g { color: $_g; }
        .b { color: $_b; }
      `)
      let node = $()
        .find('rule')
        .eq(1)
        .prev('rule')
      // a "space" node is the prev node
      expect(node.length()).to.equal(0)
    })
  })
  describe('#prevAll', () => {
    it('selects the previous sibling for each item in the selection', () => {
      let { $ } = getAST(`
        .r { color: $_r; }
        .g { color: $_g; }
        .b { color: $_b; }
      `)
      let nodes = $()
        .find('rule')
        .eq(1)
        .prevAll()
        .get()
      expect(nodes.map(getType)).to.deep.equal(['space', 'rule', 'space'])
    })
    it('optionally filters selection', () => {
      let { $ } = getAST(`
        .r { color: $_r; }
        .g { color: $_g; }
        .b { color: $_b; }
      `)
      let classNames = $()
        .find('rule')
        .eq(2)
        .prevAll('rule')
        .find('class')
        .value()
      expect(classNames).to.deep.equal('gr')
    })
  })
  describe('#value', () => {
    it('reduces all nodes with a string value', () => {
      let { $ } = getAST(`
        .r { .g { .b {} } }
        .c .m .y .k { }
      `)
      let value = $()
        .find('class')
        .value()
      expect(value).to.deep.equal('rgbcmyk')
    })
    it('reduces all nodes with a string value (interpolation)', () => {
      let { $ } = getAST(`
        .r-#{g}-#{b} { color: $red; }
      `)
      let value = $()
        .find('class')
        .value()
      expect(value).to.deep.equal('r-g-b')
    })
  })
})
