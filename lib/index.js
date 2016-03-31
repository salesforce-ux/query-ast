'use strict'

const _ = require('lodash')
const invariant = require('invariant')

/**
 * Create a new query function
 *
 * @function createQuery
 * @param {object} ast
 * @param {QueryOptions} options
 * @returns {function}
 */
module.exports = (ast, options) => {

  invariant(_.isPlainObject(ast), '"ast" must be a plain object')

  /**
   * @namespace QueryOptions
   */
  options = _.defaults({}, options, {
    /**
     * Return true if the node has children
     *
     * @memberof QueryOptions
     * @instance
     * @param {object} node
     * @returns {boolean}
     */
    hasChildren: (node) => Array.isArray(node.value),
    /**
     * Return an array of children for a node
     *
     * @memberof QueryOptions
     * @instance
     * @param {object} node
     * @returns {object[]}
     */
    getChildren: (node) => node.value,
    /**
     * Return a string representation of the node's type
     *
     * @memberof QueryOptions
     * @instance
     * @param {object} node
     * @returns {string}
     */
    getType: (node) => node.type,
    /**
     * Convert the node back to JSON. This usually just means merging the
     * children back into the node
     *
     * @memberof QueryOptions
     * @instance
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
     * @memberof QueryOptions
     * @instance
     * @param {object} node
     * @returns {string}
     */
    toString: (node) => {
      return _.isString(node.value) ? node.value : ''
    }
  })

  for (let key of ['hasChildren', 'getChildren', 'getType', 'toJSON', 'toString']) {
    invariant(_.isFunction(options[key]),
      `options.${key} must be a function`)
  }

  // Commonly used options
  let { hasChildren, getChildren, getType, toJSON, toString } = options

  /**
   * Wrap an AST node to get some basic helpers / parent reference
   */
  class Node {
    /**
     * Create a new Node
     *
     * @param {object} node
     * @param {Node} [parent]
     */
    constructor (node, parent) {
      this.node = node
      this.parent = parent
      this.children = this.hasChildren
        ? getChildren(node).map((n) => new Node(n, this))
        : null
    }
    get hasChildren () {
      return hasChildren(this.node)
    }
    /**
     * Return the JSON representation
     *
     * @returns {object}
     */
    toJSON () {
      return toJSON(
        this.node,
        this.hasChildren ? this.children.map((n) => n.toJSON()) : null
      )
    }
    /**
     * Recursivley reduce the node and it's children
     *
     * @param {function} fn
     * @param {any} acc
     * @returns {object}
     */
    reduce (fn, acc) {
      return this.hasChildren
        ? fn(this.children.reduce((a, n) => n.reduce(fn, a), acc), this)
        : fn(acc, this)
    }
    /**
     * Create a new Node or return the argument if it's already a Node
     *
     * @param {object|Node} node
     * @param {Node} [parent]
     * @returns {Node}
     */
    static create (node, parent) {
      if (node instanceof Node) return node
      return new Node(node, parent)
    }
    /**
     * Return true if the provided argument is a Node
     *
     * @param {any} node
     * @returns {Node}
     */
    static isNode (node) {
      return node instanceof Node
    }
  }

  /**
   * The root node that will be used if no argument is provided to $()
   */
  const ROOT = Node.create(ast)

  /*
   * @typedef {string|regexp|function} Wrapper~Selector
   */

  /**
   * Return a function that will be used to filter an array of Nodes
   *
   * @private
   * @param {string|function} selector
   * @param {boolean} required
   * @returns {function}
   */
  let getSelector = (selector) => {
    let isString = _.isString(selector)
    let isRegExp = _.isRegExp(selector)
    let isFunction = _.isFunction(selector)
    if (!(isString || isRegExp || isFunction)) return (n) => true
    if (isString) return (n) => getType(n.node) === selector
    if (isRegExp) return (n) => selector.test(getType(n.node))
    if (isFunction) return selector
  }

  /**
   * Convenience function to return a new Wrapper
   *
   * @private
   * @returns {Wrapper}
   */
  let $ = (...args) => new Wrapper(...args)

  /**
   * Wrap a {@link Node} or {@link Node} array with chainable traversal/mutation functions
   */
  class Wrapper {
    /**
     * Create a new Wrapper
     *
     * @private
     * @param {Node|Node[]} node
     * @param {Wrapper} [prevWrapper]
     */
    constructor (node, prevWrapper) {
      if (!node) node = ROOT
      let nodes = _.flatten([node])
      invariant(_.every(nodes, Node.isNode),
        'Only Node instances can be passed in to a Wrapper')
      invariant(!prevWrapper || prevWrapper instanceof Wrapper,
        'prevWrapper must be an instance of Wrapper')
      this.nodes = nodes
      this.prevWrapper = prevWrapper
    }
    /**
     * Return a new wrapper filtered by a selector
     *
     * @private
     * @param {Node[]} nodes
     * @param {function} selector
     * @returns {Wrapper}
     */
    $filter (nodes, selector) {
      nodes = nodes.filter(selector)
      return $(nodes, this)
    }
    /**
     * Return the wrapper as a JSON node or array of JSON nodes
     *
     * @param {number} [index]
     * @returns {object|object[]}
     */
    get (index) {
      return _.isInteger(index)
        ? this.nodes[index].toJSON()
        : this.nodes.map((n) => n.toJSON())
    }
    /**
     * Return the number of nodes in the wrapper
     *
     * @returns {number}
     */
    length () {
      return this.nodes.length
    }
    /**
     * Search for a given node in the set of matched nodes.
     *
     * If no argument is passed, the return value is an integer indicating
     * the position of the first node within the Wrapper relative
     * to its sibling nodes.
     *
     * If called on a collection of nodes and a Node is passed in, the return value
     * is an integer indicating the position of the passed Node relative
     * to the original collection.
     *
     * If a selector is passed as an argument, the return value is an integer
     * indicating the position of the first node within the Wrapper relative
     * to the nodes matched by the selector.
     *
     * If the selctor doesn't match any nodes, it will return -1.
     *
     * @param {Node|Wrapper~Selector} [node]
     * @returns {number}
     */
    index (node) {
      if (!node) {
        let n = this.nodes[0]
        if (n) {
          let p = n.parent
          if (p && p.hasChildren) return p.children.indexOf(n)
        }
        return -1
      }
      if (Node.isNode(node)) {
        return this.nodes.indexOf(node)
      }
      let n = this.nodes[0]
      let p = n.parent
      if (!p.hasChildren) return -1
      let selector = getSelector(node)
      return this.$filter(p.children, selector).index(this.nodes[0])
    }
    /**
     * Insert a node after each node in the set of matched nodes
     *
     * @param {object} node
     * @returns {Wrapper}
     */
    after (node) {
      for (let n of this.nodes) {
        let p = n.parent
        if (!p.hasChildren) continue
        let i = $(n).index()
        if (i >= 0) p.children.splice(i + 1, 0, Node.create(node, p))
      }
      return this
    }
    /**
     * Insert a node before each node in the set of matched nodes
     *
     * @param {object} node
     * @returns {Wrapper}
     */
    before (node) {
      for (let n of this.nodes) {
        let p = n.parent
        if (!p.hasChildren) continue
        let i = p.children.indexOf(n)
        if (i >= 0) p.children.splice(i, 0, Node.create(node, p))
      }
      return this
    }
    /**
     * Remove the set of matched nodes
     *
     * @returns {Wrapper}
     */
    remove () {
      for (let n of this.nodes) {
        let p = n.parent
        if (!p.hasChildren) continue
        let i = p.children.indexOf(n)
        if (i >= 0) p.children.splice(i, 1)
      }
      return this
    }
    /**
     * Replace each node in the set of matched nodes by returning a new node
     * for each node that will be replaced
     *
     * @param {function} fn
     * @returns {Wrapper}
     */
    replace (fn) {
      for (let n of this.nodes) {
        let p = n.parent
        if (!p.hasChildren) continue
        let i = p.children.indexOf(n)
        if (i >= 0) p.children.splice(i, 1, Node.create(fn(n), p))
      }
      return this
    }
    /**
     * Map the set of matched nodes
     *
     * @param {function} fn
     * @returns {array}
     */
    map (fn) {
      return this.nodes.map(fn)
    }
    /**
     * Reduce the set of matched nodes
     *
     * @param {function} fn
     * @param {any} acc
     * @returns {any}
     */
    reduce (fn, acc) {
      return this.nodes.reduce(fn, acc)
    }
    /**
     * Get the children of each node in the set of matched nodes,
     * optionally filtered by a selector
     *
     * @param {Wrapper~Selector} [selector]
     * @returns {Wrapper}
     */
    children (selector) {
      selector = getSelector(selector)
      let nodes = _.flatMap(this.nodes, (n) => n.hasChildren ? n.children : [])
      return this.$filter(nodes, selector)
    }
    /**
     * For each node in the set of matched nodes, get the first node that matches
     * the selector by testing the node itself and traversing up through its ancestors
     *
     * @param {Wrapper~Selector} [selector]
     * @returns {Wrapper}
     */
    closest (selector) {
      selector = getSelector(selector)
      let nodes = _.uniq(_.flatMap(this.nodes, (n) => {
        let parent = n
        while (parent) {
          if (selector(parent)) break
          parent = parent.parent
        }
        return parent || []
      }))
      return $(nodes, this)
    }
    /**
     * Reduce the set of matched nodes to the one at the specified index
     *
     * @param {number} index
     * @returns {Wrapper}
     */
    eq (index) {
      invariant(_.isInteger(index),
        'eq() requires an index')
      return $(this.nodes[index] || [], this)
    }
    /**
     * Get the descendants of each node in the set of matched nodes,
     * optionally filtered by a selector
     *
     * @param {Wrapper~Selector} [selector]
     * @returns {Wrapper}
     */
    find (selector) {
      selector = getSelector(selector)
      let nodes = _.uniq(_.flatMap(this.nodes, (n) =>
        n.reduce((a, n) => selector(n) ? a.concat(n) : a, [])))
      return $(nodes, this)
    }
    /**
     * Reduce the set of matched nodes to those that match the selector
     *
     * @param {Wrapper~Selector} [selector]
     * @returns {Wrapper}
     */
    filter (selector) {
      selector = getSelector(selector)
      return this.$filter(this.nodes, selector)
    }
    /**
     * Reduce the set of matched nodes to the first in the set.
     *
     * @returns {Wrapper}
     */
    first () {
      return this.eq(0)
    }
    /**
     * Reduce the set of matched nodes to those that have a descendant
     * that matches the selector
     *
     * @param {Wrapper~Selector} [selector]
     * @returns {Wrapper}
     */
    has (selector) {
      let filter = (n) => $(n).find(selector).length() > 0
      return this.$filter(this.nodes, filter)
    }
    /**
     * Reduce the set of matched nodes to the final one in the set
     *
     * @returns {Wrapper}
     */
    last () {
      return this.eq(this.length() - 1)
    }
    /**
     * Get the immediately following sibling of each node in the set of matched nodes,
     * optionally filtered by a selector
     *
     * @param {Wrapper~Selector} [selector]
     * @returns {Wrapper}
     */
    next (selector) {
      selector = getSelector(selector)
      let nodes = _.flatMap(this.nodes, (n) => {
        let index = this.index()
        return index >= 0 && index < n.parent.children.length - 1
          ? n.parent.children[index + 1] : []
      })
      return this.$filter(nodes, selector)
    }
    /**
     * Get all following siblings of each node in the set of matched nodes,
     * optionally filtered by a selector
     *
     * @param {Wrapper~Selector} [selector]
     * @returns {Wrapper}
     */
    nextAll (selector) {
      selector = getSelector(selector)
      let nodes = _.flatMap(this.nodes, (n) => {
        let index = this.index()
        return index >= 0 && index < n.parent.children.length - 1
          ? _.drop(n.parent.children, index + 1) : []
      })
      return this.$filter(nodes, selector)
    }
    /**
     * Get the parent of each nodes in the current set of matched nodess,
     * optionally filtered by a selector
     *
     * @param {Wrapper~Selector} [selector]
     * @returns {Wrapper}
     */
    parent (selector) {
      selector = getSelector(selector)
      let nodes = this.nodes.map((n) => n.parent)
      return this.$filter(nodes, selector)
    }
    /**
     * Get the ancestors of each nodes in the current set of matched nodess,
     * optionally filtered by a selector
     *
     * @param {Wrapper~Selector} [selector]
     * @returns {Wrapper}
     */
    parents (selector) {
      selector = getSelector(selector)
      let nodes = _.uniq(_.flatMap(this.nodes, (n) => {
        let parents = []
        let parent = n.parent
        while (parent) {
          parents.push(parent)
          parent = parent.parent
        }
        return parents
      }))
      return this.$filter(nodes, selector)
    }
    /**
     * Get the ancestors of each node in the set of matched nodes,
     * up to but not including the node matched by the selector
     *
     * @param {Wrapper~Selector} [selector]
     * @returns {Wrapper}
     */
    parentsUntil (selector) {
      selector = getSelector(selector)
      let nodes = _.uniq(_.flatMap(this.nodes, (n) => {
        let parents = []
        let parent = n.parent
        while (parent && !selector(parent)) {
          parents.push(parent)
          parent = parent.parent
        }
        return parents
      }))
      return $(nodes, this)
    }
    /**
     * Get the immediately preceding sibling of each node in the set of matched nodes,
     * optionally filtered by a selector
     *
     * @param {Wrapper~Selector} [selector]
     * @returns {Wrapper}
     */
    prev (selector) {
      selector = getSelector(selector)
      let nodes = _.flatMap(this.nodes, (n) => {
        let index = this.index()
        return index > 0 ? n.parent.children[index - 1] : []
      })
      return this.$filter(nodes, selector)
    }
    /**
     * Get all preceding siblings of each node in the set of matched nodes,
     * optionally filtered by a selector
     *
     * @param {Wrapper~Selector} [selector]
     * @returns {Wrapper}
     */
    prevAll (selector) {
      selector = getSelector(selector)
      let nodes = _.flatMap(this.nodes, (n) => {
        let index = this.index()
        return index > 0 ? _.take(n.parent.children, index).reverse() : []
      })
      return this.$filter(nodes, selector)
    }
    /**
     * Get the combined string contents of each node in the set of matched nodes,
     * including their descendants
     */
    value () {
      return this.nodes.reduce((v, n) => {
        return n.reduce((v, n) => {
          return v + toString(n.node)
        }, v)
      }, '')
    }
  }

  return (node) => $(node)
}
