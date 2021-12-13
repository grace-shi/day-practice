const fs = require('fs')
const posthtml = require('posthtml')
const selectorParser = require('postcss-selector-parser')
const purgePlugin = options => {
  const extractInfo = {
    id: [],
    class: [],
    tag: []
  }

  const transformSelector = selectors => {
    selectors.walk(selector => {
      selector.nodes && selector.nodes.forEach(selectorNode => {
        let shouldRemove = false;
        switch(selectorNode.type) {
          case 'tag':
            if (extractInfo.tag.indexOf(selectorNode.value) === -1) {
              shouldRemove = true
            }
            break;
          case 'class':
            if (extractInfo.class.indexOf(selectorNode.value) === -1) {
              shouldRemove = true
            }
            break;
          case 'id':
            if (extractInfo.id.indexOf(selectorNode.value) === -1) {
              shouldRemove = true
            }
            break;
        }
    
        if(shouldRemove) {
          selectorNode.remove();
        }
      })
    })
  }

  htmlExtactor(options && options.html, extractInfo)

  return {
    postcssPlugin: 'postcss-purge',
    Rule (rule) {
      const newSelector = rule.selector.split(',').map(item => {
        // 对每个选择器做转换
        const transformed = selectorParser(transformSelector).processSync(item);
        return transformed !== item ? '' : item;
      }).filter(Boolean).join(',');

      if(newSelector === '') {
        rule.remove();
      } else {
        rule.selector = newSelector;
      }
    }
  }
}

/**
 * htmlExtractor 的具体实现就是读取 html 的内容, 
 * @param {*} html 原始html
 * @param {*} extractInfo 对 html 做 parse 生成 AST，遍历 AST，记录 id、class、tag
 */
function htmlExtactor (html, extractInfo) {
  const content = fs.readFileSync(html, 'utf-8');

  const extractPlugin = options => tree => {
    return tree.walk(node => {
      extractInfo.tag.push(node.tag);
      if (node.attrs) {
        extractInfo.id.push(node.attrs.id)
        extractInfo.class.push(node.attrs.class)
      }
      return node
    })
  }

  posthtml([extractPlugin()]).process(content)

  extractInfo.id = extractInfo.id.filter(Boolean)
  extractInfo.class = extractInfo.class.filter(Boolean)
  extractInfo.tag = extractInfo.tag.filter(Boolean)
}

module.exports = purgePlugin;