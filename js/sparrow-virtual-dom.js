/**
 * Created by luwenxu on 2016/1/26.
 */

(function (window){
    function extend(obj) {
        var length = arguments.length;
        obj == undefined && (obj = {});
        if (length < 2 || obj == null) return obj;
        for (var index = 1; index < length; index++) {
            var source = arguments[index],
                keys = Object.keys(source),
                l = keys.length;
            for (var i = 0; i < l; i++) {
                var key = keys[i];
                obj[key] = source[key];
            }
        }
        return obj;
    }

    function _Sparrow() {
        this.version = '.0';
    }

    _Sparrow.prototype.component = function (component) {
        return new Component(component)
    };

    _Sparrow.prototype.node = function (type, prop, children) {

        return new Sparrow_Node(type, prop, children)
    };

    var DIFF = {
        CREATE: 'CREATE',
        DELETE: 'DELETE',
        UPDATE: 'UPDATE',
        REPLACE: 'REPLACE',
        REPLACE_ROOT: 'REPLACE_ROOT'
    };

    /*function (newNode, oldNode, nodeLevel, changeCollection){
     if (newNode.type instanceof Component && oldNode.type instanceof Component) {
     this.diff(newNode._paintbrush, oldNode._paintbrush, nodeLevel,changeCollection)
     }
     }*/

    function isComponent(node) {
        return node instanceof Component
    }

    function isString(str) {
        return typeof str === 'string'
    }

    function Diff(type, nodeLevel, nodeIndex, newVal) {
        this.type = type;
        this.nodeLevel = nodeLevel;
        this.nodeIndex = nodeIndex;
        this.newVal = newVal;
    }

    /*diff*/
    _Sparrow.prototype.diff = function (newNode, oldNode, nodeLevel, nodeIndex) {
        var changes = [];
        nodeLevel === undefined && (nodeLevel = 0);
        nodeIndex === undefined && (nodeIndex = 0);
        var nt = newNode.type, ot = oldNode.type;
        /*diff string*/
        if(isString(newNode)){
            if(isString(oldNode) && newNode!==oldNode){
                changes.push(new Diff(DIFF.UPDATE, nodeLevel, nodeIndex, newNode));
            }
            if(!isString(oldNode)){
                changes.push(new Diff(DIFF.REPLACE,nodeLevel,nodeIndex,newNode))
            }
            return changes;
        }
        /*diff type*/
        if (nt !== ot) {
            changes.push(new Diff(DIFF.REPLACE, nodeLevel, nodeIndex, newNode));
        } else {
            switch (true) {
                case (isComponent(nt)):
                {
                    changes = changes.concat(this.diff(newNode._paintbrush, oldNode._paintbrush, nodeLevel, nodeIndex));
                    break;
                }
                case(isString(nt)):
                {
                    var nc=newNode.children,oc=oldNode.children;
                    nodeLevel++;
                    for (var i = 0; i < oc.length; i++) {
                        var nChild = nc[i], oChild = oc[i];
                        if (!nChild) {
                            changes.push(new Diff(DIFF.DELETE, nodeLevel, i, null));
                            continue;
                        }
                        changes=changes.concat(this.diff(nChild,oChild,nodeLevel,nodeIndex+'-'+i));
                    }
                    if (nc.length > oc.length) {
                        changes.push(new Diff(DIFF.CREATE, nodeLevel, oc.length, nc.slice(oc.length)))
                    }
                }
            }
        }
        return changes;
    };

    function Component(desc) {
        this._component = desc;
        try {
            if (!desc.componentName) {
                throw 'you must give me a componentName';
            }
            this.componentName = desc.componentName;
        } catch (err) {
            console.error(err)
        } finally {

        }
    }

    function childrenPaint(spn) {
        var component = spn.type;
        if (component instanceof Component) {
            component.outerProp = spn.prop;
            spn._paintbrush = component.paint();
            delete spn.children;
        }
        if (typeof component === "string") {
            for (var i = 0; i < spn.children.length; i++) {
                childrenPaint(spn.children[i]);
            }
        }
    }

    Component.prototype.paint = function () {
        var spn = this._component.render(this.outerProp), spn_c;
        childrenPaint(spn);
        return spn;

    };

    function Sparrow_Node(type, prop, children) {
        this.type = type;
        this.prop = prop;
        this.children = children;
    }

    Sparrow_Node.prototype.tree = function (parent) {
        var nodeType = this.type, children = this.children;
        var ele;
        if (nodeType instanceof Component) {
            ele = this._paintbrush.tree(parent);
        } else {
            ele = document.createElement(nodeType);
            for (var i = 0; i < children.length; i++) {
                var child = children[i];
                if (typeof child == 'string') {
                    ele.appendChild(document.createTextNode(child));
                } else {
                    ele.appendChild(child.tree())
                }
            }
        }
        return ele;
    };

    window.sparrow = new _Sparrow();
})(window);