module.exports = {
  adapter: {
    getName: function (node) {
      return node.nodeName;
    },
    getChildren: function (node) {

      var nodes = Array.prototype.slice.call(node.childNodes);
      return nodes.map(node => {
        if (node.nodeType === 3) {
          return node.textContent;
        }
        return node;
      });
    },
    getAttributes: function (node) {
      var attributes = {};
      var isRoot = node.parentNode === null;
      if (isRoot) {
        return extractDoctype(node);
      }
      var attributeNames = (node.getAttributeNames && node.getAttributeNames() || []);

      attributeNames.forEach(function (attributeName) {
        attributes[attributeName] = node.getAttribute(attributeName);
      });
      return attributes;
    }
  }
};

function extractDoctype(node) {
  var doctype = node.doctype;
  return {
    name: doctype.name,
    publicId: doctype.publicId || '',
    systemId: doctype.systemId || ''
  };
}
