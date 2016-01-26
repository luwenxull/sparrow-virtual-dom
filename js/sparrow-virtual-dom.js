/**
 * Created by luwenxu on 2016/1/26.
 */

(function (window) {
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
        UPDATE_PROP: 'UPDATE_PROP',
        REPLACE: 'REPLACE'
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

    function diffProp(newNode, oldNode, nodeLevel, nodeIndex, changes) {
        //console.log('prop>>>',newNode,oldNode)
        if (!_.isEqual(newNode.prop, oldNode.prop)) {
            changes.push(new Diff(DIFF.UPDATE_PROP, nodeLevel, nodeIndex, newNode.prop))
        }
    }

    /*diff*/
    _Sparrow.prototype.diff = function (newNode, oldNode, nodeLevel, nodeIndex) {
        var changes = [];
        nodeLevel === undefined && (nodeLevel = 0);
        nodeIndex === undefined && (nodeIndex = 0);
        var nt = newNode.type, ot = oldNode.type;

        if(!newNode){
            return new Diff(DIFF.DELETE, nodeLevel, nodeIndex, null);
        }
        /*diff string*/
        if (isString(newNode)) {
            if (isString(oldNode) && newNode !== oldNode) {
                changes.push(new Diff(DIFF.UPDATE, nodeLevel, nodeIndex, newNode));
            }
            if (!isString(oldNode)) {
                changes.push(new Diff(DIFF.REPLACE, nodeLevel, nodeIndex, newNode))
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
                    diffProp(newNode, oldNode, nodeLevel, nodeIndex, changes);
                    var nc = newNode.children, oc = oldNode.children;
                    nodeLevel++;
                    if(oc){
                        for (var i = 0; i < oc.length; i++) {
                            var nChild = nc[i], oChild = oc[i];
                            /*                        if (!nChild) {
                             changes.push(new Diff(DIFF.DELETE, nodeLevel, i, null));
                             continue;
                             }*/
                            changes = changes.concat(this.diff(nChild, oChild, nodeLevel, nodeIndex + '-' + i));
                        }
                        if (nc.length > oc.length) {
                            changes.push(new Diff(DIFF.CREATE, nodeLevel, nodeIndex + '-' + oc.length, nc.slice(oc.length)))
                        }
                    }else{

                    }

                }
            }
        }
        return changes;
    };

    function Component(desc) {
        this._component = desc;
        desc.defaultProp && (this.defaultProp = desc.defaultProp());
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
        if (spn === undefined) {
            return;
        }
        var component = spn.type;

        if (component instanceof Component) {
            spn._paintbrush = component.paint(spn.prop);
            delete spn.children;
        }
        if (typeof component === "string" && spn.children) {
            for (var i = 0; i < spn.children.length; i++) {
                childrenPaint(spn.children[i]);
            }
        }
    }

    Component.prototype.paint = function (prop) {
        var spn = this._component.render(extend({}, this.defaultProp || {}, prop || {}), this.state || {});
        childrenPaint(spn);
        return spn;

    };

    Component.prototype.setState = function (state) {
        if (!this.state) this.state = {};
        extend(this.state, state);
        return this;
    };
    function Sparrow_Node(type, prop, children) {
        this.type = type;
        this.prop = prop;
        this.children = children;
    }

    Sparrow_Node.prototype.tree = function () {
        var nodeType = this.type, children = this.children;
        var ele;
        if (nodeType instanceof Component) {
            ele = this._paintbrush.tree();
        } else {
            ele = document.createElement(nodeType);
            //ele.setAttribute()
            if (this.prop) {
                var props = Object.keys(this.prop);
                props.forEach(function (prop) {
                    ele.setAttribute(prop, this.prop[prop])
                }.bind(this))
            }
            for (var i = 0; i < children.length; i++) {
                var child = children[i];
                if (typeof child == 'string') {
                    ele.appendChild(document.createTextNode(child));
                } else {
                    try {
                        var r=child.tree();
                    } catch (err) {
                        console.error(err.name+':',err.message)
                    } finally {
                        r && ele.appendChild(r)
                    }
                }
            }
        }
        return ele;
    };

    window.sparrow = new _Sparrow();
})(window);