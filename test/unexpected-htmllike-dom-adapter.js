/*global describe, it*/
var unexpected = require('unexpected');
var jsdom = require('jsdom');
var UnexpectedHtmlLike = require('unexpected-htmllike');

var unexpectedDom = require('../lib/index');
var expect = unexpected.clone().installPlugin(unexpectedDom);

var adapter = {
  getName: function (element) {
    return element.tagName;
  },
  getChildren: function (element) {
    return Array.prototype.slice.call(element.childNodes);
  },
  getAttributes: function (element) {
    var attributes = {};

    element.getAttributeNames().forEach(function (attributeName) {
      attributes[attributeName] = element.getAttribute(attributeName);
    });
    return attributes;
  }
};

var createDocumentWithBody = function(body) {
  return new jsdom.JSDOM('<!DOCTYPE html><html><body>'+body+'</body><html>').window.document;
};

describe('unexpected-htmllike-dom-adapter', function () {
  describe('getName(element)', function () {
    it('returns tag name for document body', function () {
      var document = createDocumentWithBody('');
      expect(adapter.getName(document.body), 'to equal', 'BODY');
    });

    it('returns tag name for an input', function () {
      var html ='<input type="text" />';
      var document = createDocumentWithBody(html);
      expect(adapter.getName(document.body.firstChild), 'to equal', 'INPUT'); // TODO: normalize necessary?
    });
  });

  describe('getChildren', function () {
    it('should return empty array for empty body', function () {
      var element = createDocumentWithBody('').body;
      expect(adapter.getChildren(element), 'to be empty');
    });

    it('should return array of nodes for non-empty body', function () {
      var element = createDocumentWithBody('<p /><p /><p />').body;
      expect(adapter.getChildren(element), 'to have length', 3);
    });
  });

  describe('getAttributes', function () {

    it('returns empty object for element without attributes', function () {
      var element = createDocumentWithBody('<p />').body.firstChild;
      expect(adapter.getAttributes(element), 'to equal', {});
    });

    it('returns object with id attribute', function () {
      var element = createDocumentWithBody('<div id="id"></div>').body.firstChild;
      expect(adapter.getAttributes(element), 'to equal', { id: 'id' });
    });

    it('returns all attributes', function () {
      var element = createDocumentWithBody('<div id="id" title="title" align="left"></div>').body.firstChild;
      expect(adapter.getAttributes(element), 'to equal', {
        id: 'id',
        title: 'title',
        align: 'left'
      });
    });

    it('can handle function handlers (how?)');
  });

  describe('integration with unexpected-htmllike', function () {
    var htmlLike = new UnexpectedHtmlLike(adapter);

    // TODO check input arguments
    // e.g.: TypeError: element.getAttributeNames is not a function
    // when passing jsdom object instead of element
    it('should be able two compare a whole document');

    it('should not find differences when comparing two empty bodies', function () {
      var subject = createDocumentWithBody('').body;
      var expected = createDocumentWithBody('').body;
      expect(subject, 'not to be', expected);

      var diffResult = htmlLike.diff(adapter, subject, expected, expect);

      expect(diffResult.weight, 'to be', 0);
    });

    it('finds a difference comparing a div to an empty list', function () {
      var subject = createDocumentWithBody('<p />').body.firstChild;
      var expected = createDocumentWithBody('').body.firstChild;

      var diffResult = htmlLike.diff(adapter, subject, expected, expect);
      expect(diffResult.weight, 'to be positive');
    });

  });

  describe('integration with unexepected-dom', function () {
    expect.installPlugin(require('magicpen-prism'));

    expect.addAssertion('<DOMElement> to TODO equal <DOMElement>', function (expect, subject, expected) {
      var htmlLike = new UnexpectedHtmlLike(adapter);
      var result = htmlLike.diff(adapter, subject, expected, expect);

      if (result.weight !== 0) {
        return expect.fail({
          diff: function (output, diff, inspect) {
            return {
              diff: htmlLike.render(result, output, diff, inspect)
            };
          }
        });
      }
    });

    it('should not throw when there is no difference', function () {
      var element1 = createDocumentWithBody('<p />').body.firstChild;
      var element2 = createDocumentWithBody('<p />').body.firstChild;
      expect(function () {
        expect(element1, 'to TODO equal', element2);
      }, 'not to throw');
    });

    it('should throw when finding a difference', function () {
      var actual = createDocumentWithBody(  '<div id="one"></div>').body.firstChild;
      var expected = createDocumentWithBody('<div id="two"></div>').body.firstChild;
      expect(function () {
        expect(actual, 'to TODO equal', expected);

      }, 'to throw', /<DIV id="one" \/\/ expected 'one' to equal 'two'/);
    });

  });
});
