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

var adapter = require('../lib/htmllike').adapter;

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

  describe('when given a DocmumentRoot node', function () {
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

  describe('when given a Element node', function () {
    describe('getName(node)', function () {
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
        var node = createDocumentWithBody('').body;
        expect(adapter.getChildren(node), 'to be empty');
      });

      it('should return array of nodes for non-empty body', function () {
        var node = createDocumentWithBody('<p /><p /><p />').body;
        expect(adapter.getChildren(node), 'to have length', 3);
      });

      it('should return text content of text element nodes', function () {
        var node = createDocumentWithBody('<p>one</p>').body.firstChild;
        expect(adapter.getChildren(node), 'to equal', ['one']);
      });

    });

    describe('getAttributes', function () {

      it('returns empty object for node without attributes', function () {
        var node = createDocumentWithBody('<p />').body.firstChild;
        expect(adapter.getAttributes(node), 'to equal', {});
      });

      it('returns object with id attribute', function () {
        var node = createDocumentWithBody('<div id="id"></div>').body.firstChild;
        expect(adapter.getAttributes(node), 'to equal', { id: 'id' });
      });

      it('returns all attributes', function () {
        var node = createDocumentWithBody('<div id="id" title="title" align="left"></div>').body.firstChild;
        expect(adapter.getAttributes(node), 'to equal', {
          id: 'id',
          title: 'title',
          align: 'left'
        });
      });

      it('can handle function handlers (how?)');

    });
  });
});

describe('integration with unexpected-htmllike', function () {
  var htmlLike = new UnexpectedHtmlLike(adapter);

  // TODO check input arguments
  // e.g.: TypeError: node.getAttributeNames is not a function
  // when passing jsdom object instead of node
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

  describe('contains()', function () {
    it('finds match when element contains other element', function () {
      var outer = createDocumentWithBody('<div><span>1</span></div>').body.firstChild;
      var div = createDocumentWithBody('<span>1</div>').body.firstChild;

      var contains = htmlLike.contains(adapter, outer, div, expect);

      expect(contains, 'to have property', 'found', true);
      expect(contains, 'to have property', 'bestMatchItem', div);
    });

    it('finds no match when element does not contain other element', function () {
      var outer = createDocumentWithBody('<div><span>1</span></div>').body.firstChild;
      var div = createDocumentWithBody('<p>2</p>').body.firstChild;

      var contains = htmlLike.contains(adapter, outer, div, expect);

      expect(contains, 'to have property', 'found', false);
    });
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

  expect.addAssertion('<DOMElement> to contain element <DOMElement>', function (expect, subject, expected) {
    var htmlLike = new UnexpectedHtmlLike(adapter);
    var result = htmlLike.contains(adapter, subject, expected, expect);

   if (!result.found) {
      expect.fail({
        diff: function (output, diff, inspect) {
          return {
            diff: htmlLike.render(result.bestMatch, output, diff, inspect)
          };
        }
      });
   }


  });
  it('should pass when diffing equal documents', function () {
    var actual = createDocumentWithBody('<div><p /></div>');
    var expected = createDocumentWithBody('<div><p /></div>');
    expect(function () {
      expect(actual, 'to htmllike-equal', expected);

    }, 'not to throw');
  });

  it('should fail when diffing two different documents', function () {
    var actual = createDocumentWithBody(  '<div id="one"></div>');
    var expected = createDocumentWithBody('<div id="two"></div>');
    expect(function () {
      expect(actual, 'to htmllike-equal', expected);

    }, 'to throw', /<DIV id="one" \/\/ expected 'one' to equal 'two'/);
  });

  it('should fail when diffing elements with different text content', function () {
    var document1 = createDocumentWithBody('<div>actual</div>');
    var document2 = createDocumentWithBody('<div>expected</div>');
    expect(function () {
      expect(document1, 'to htmllike-equal', document2);
    }, 'to throw');
  });

  describe('to contain element', function () {
    it('should pass when calling with contained elements', function () {
      var element1 = createDocumentWithBody('<div><span>1</span></div>').body.firstChild;
      var element2 = createDocumentWithBody('<span>1</span>').body.firstChild;
      expect(function () {
        expect(element1, 'to contain element', element2);
      }, 'not to throw');
    });

    it('should fail when expecting it to contain an element it does not contain', function () {
      var element1 = createDocumentWithBody('<div><span>1</span></div>').body.firstChild;
      var element2 = createDocumentWithBody('<p>other</p>').body.firstChild;
      expect(function () {
        expect(element1, 'to contain element', element2);
      }, 'to throw', 'expected <div><span>1</span></div> to contain element <p>other</p>\n\n<SPAN // should be <P\n>\n  1 // -1\n    // +other\n</SPAN>');
    });

  });
});
