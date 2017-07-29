/*global describe, it*/
var DOCTYPES = {
  HTML5: '<DOCTYPE HTML>',
  HTML4: '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN\n' +
    '"http://www.w3.org/TR/html4/strict.dtd">'
};

var unexpected = require('unexpected');
var jsdom = require('jsdom');
var UnexpectedHtmlLike = require('unexpected-htmllike');

var unexpectedDom = require('../lib/index');
var expect = unexpected.clone().installPlugin(unexpectedDom);

function extractDoctype(node) {
  var doctype = node.doctype;
  return {
    name: doctype.name,
    publicId: doctype.publicId || '',
    systemId: doctype.systemId || ''
  };
}

var adapter = {
  getName: function (element) {
    return element.nodeName;
  },
  getChildren: function (element) {
    return Array.prototype.slice.call(element.childNodes);
  },
  getAttributes: function (element) {
    var attributes = {};
    var isRoot = element.parentNode === null;
    if (isRoot) {
      return extractDoctype(element);
    }
    var attributeNames = (element.getAttributeNames && element.getAttributeNames() || []);

    attributeNames.forEach(function (attributeName) {
      attributes[attributeName] = element.getAttribute(attributeName);
    });
    return attributes;
  }
};

var createDocument = function (html) {
  return new jsdom.JSDOM(html).window.document;
};

var createDocumentWithBody = function(body) {
  return createDocument('<!DOCTYPE html><html><body>'+body+'</body><html>');
};

var createHTML5Document = function () {
  return createDocument(DOCTYPES.HTML5 + '<html><body></body><html>');
};

describe('unexpected-htmllike-dom-adapter', function () {
  describe('for the document root', function () {
    it('returns the correct node name', function () {
      var document = createDocument();
      expect(adapter.getName(document), 'to equal', '#document');
    });

    // TODO: jsdom always has doctype null?
    it.skip('contains the doctype as an attribute', function () {
      var doctype = DOCTYPES.HTML5;
      var document = createHTML5Document(doctype);
      expect(adapter.getAttributes(document), 'to equal', {
        doctype: {
          name: doctype, publicId: '', systemId: ''
        }
      });
    });
  });

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

    it('should not find differences when comparing two empty documents', function () {
      var subject = createDocumentWithBody('');
      var expected = createDocumentWithBody('');
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

    expect.addAssertion('<DOMDocument|DOMElement> to htmllike-equal <DOMDocument|DOMElement>', function (expect, subject, expected) {
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

    it('should not throw when diffing two equal documents', function () {
      var actual = createDocumentWithBody('<div><p /></div>');
      var expected = createDocumentWithBody('<div><p /></div>');
      expect(function () {
        expect(actual, 'to htmllike-equal', expected);

      }, 'not to throw');
    });

    it('should throw when finding a difference in two different DOMElements', function () {
      var actual = createDocumentWithBody(  '<div id="one"></div>');
      var expected = createDocumentWithBody('<div id="two"></div>');
      expect(function () {
        expect(actual, 'to htmllike-equal', expected);

      }, 'to throw', /<DIV id="one" \/\/ expected 'one' to equal 'two'/);
    });

    it.skip('should throw when comparing documents with different DOCTYPE', function () {
      var someHtml =  '<html><body></body></html>';
      var doc1 = createDocument(DOCTYPES.HTML5 + someHtml);
      var doc2 = createDocument(DOCTYPES.HTML4 + someHtml);

      expect(function () {
        expect(doc1, 'to htmllike-equal', doc2);
      }, 'to throw', '');
    });

  });
});
