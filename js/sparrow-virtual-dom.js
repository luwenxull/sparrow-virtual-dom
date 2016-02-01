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

    function each(items, iterator) {
        for (var i = 0; i < items.length; i++) {
            iterator(items[i], i)
        }
    }


    function isComponent(type) {
        return typeof type === 'function' && type.$componentName !== undefined
    }

    function isString(str) {
        return typeof str === 'string'
    }

    function isNumber(num) {
        return typeof num === 'number'
    }

    function isSimple(data) {
        return typeof data === 'string' || typeof data === 'number'
    }

    function isArray(arr) {
        return arr instanceof Array
    }

    var DIFF = {
        CREATE: 'CREATE',
        CREATE_ALL: 'CREATE_ALL',
        DELETE: 'DELETE',
        DELETE_ALL: 'DELETE_ALL',
        UPDATE: 'UPDATE',
        UPDATE_PROP: 'UPDATE_PROP',
        REPLACE: 'REPLACE'
    };

    function sameType(newType, oldType) {
        if (isComponent(newType) && isComponent(oldType)) {
            return newType.$componentName === oldType.$componentName
        } else if (isString(newType) && isString(oldType)) {
            return newType === oldType
        } else {
            return false;
        }
    }

    function Diff(type, nodeLevel, nodeIndex, newVal) {
        this.type = type;
        this.nodeLevel = nodeLevel;
        this.nodeIndex = nodeIndex;
        this.newVal = newVal;
    }

    function diffTwoNodes(newNode, oldNode, nodeLevel, nodeIndex, suffix) {
        var changes = [];
        nodeLevel === undefined && (nodeLevel = 0);
        nodeIndex === undefined && (nodeIndex = 0);

        if (!newNode && oldNode) {
            changes.push(new Diff(suffix ? DIFF.DELETE_ALL : DIFF.DELETE, nodeLevel, nodeIndex, null));
            return changes;
        }
        if (!oldNode && newNode) {
            changes.push(new Diff(suffix ? DIFF.CREATE_ALL : DIFF.CREATE, nodeLevel, nodeIndex, [newNode]));
            return changes;
        }
        if (!oldNode && !newNode) return [];

        var nt = newNode.type, ot = oldNode.type;
        /*diff string*/
        if (isSimple(newNode)) {
            if (isSimple(oldNode) && newNode !== oldNode) {
                changes.push(new Diff(DIFF.UPDATE, nodeLevel, nodeIndex, newNode));
            }
            if (!isSimple(oldNode)) {
                changes.push(new Diff(DIFF.REPLACE, nodeLevel, nodeIndex, newNode))
            }
            return changes;
        }
        /*diff type*/
        if (!sameType(nt, ot)) {
            changes.push(new Diff(DIFF.REPLACE, nodeLevel, nodeIndex, newNode));
        } else {
            switch (true) {
                case (isComponent(nt)):
                {
                    changes = changes.concat(diffTwoNodes(newNode._paintbrush, oldNode._paintbrush, nodeLevel, nodeIndex));
                    break;
                }
                case(isString(nt)):
                {
//                        diffProp(newNode, oldNode, nodeLevel, nodeIndex, changes);
                    var nc = newNode.children, oc = oldNode.children;
                    nodeLevel++;
                    /*both no children*/
                    if (!oc || !nc) {
                        changes = changes.concat(diffTwoNodes(nc, oc, nodeLevel, nodeIndex, true));
                    } else {
                        for (var i = 0; i < oc.length; i++) {
                            var nChild = nc[i], oChild = oc[i];
                            /*                        if (!nChild) {
                             changes.push(new Diff(DIFF.DELETE, nodeLevel, i, null));
                             continue;
                             }*/
                            changes = changes.concat(diffTwoNodes(nChild, oChild, nodeLevel, nodeIndex + '-' + i));
                        }
                        if (nc.length > oc.length) {
                            changes.push(new Diff(DIFF.CREATE, nodeLevel, nodeIndex + '-' + oc.length, nc.slice(oc.length)))
                        }
                    }
                }
            }
        }

        return changes;
    }
    function SparrowNode() {

    }

    function node(type, prop, children) {
        var node = new SparrowNode();
        node.type = type;
        node.prop = prop;

        if (!isArray(children)) {
            children = [children]
        }
        node.children = children;
        return node;
    }

    function Facade() {
    }

    Facade.prototype = {
        constructor: Facade,
        setState: function (newState) {
//                console.log(this)
            var oldNode = this._cacheNode._paintbrush;//这一步可能有问题
            extend(this.state, newState);
            var newNode = this.render();
            var diffs = diffTwoNodes(newNode, oldNode);
            console.log(diffs)
        }
    };
    function mount(spn, parent) {

//            var ele=tree(spn);
        console.log(ele);
        console.log(spn);
//            parent.appendChild(ele)
    }

    var uuid = 0;
    function tree(spn, component) {
        var ele;
        if (typeof spn === 'string') {
            ele = document.createTextNode(spn);
        }
        var type = spn.type, prop, attr, children = spn.children;
        prop = attr = spn.prop;
        if (typeof type === 'function') {
            var componentInstance = new type();
            extend(componentInstance.prop, prop || {});

            var node = componentInstance.render();
            //do something for future diff
            spn._paintbrush = node;
            delete spn.children;
            componentInstance._cacheNode = spn;

            ele = tree(node, componentInstance);
            componentInstance.$renderedDOM = ele;
            console.log(componentInstance);
        }
        if (typeof type === 'string') {
            ele = document.createElement(type);
            each(children, function (child, i) {
                ele.appendChild(tree(child))
            });
            if (attr && attr.onClick) {
                ele.addEventListener('click', component.handleClick.bind(component))
            }
        }
        return ele;
    }
    var sparrow = {
        createComponent: function (describe) {
            var Component = function () {
                extend(this, describe);
                /**/
                this.state = this.initialState && this.initialState() || {};
                this.prop = this.defaultProp && this.defaultProp() || {};

                delete this.initialState;
                delete this.defaultProp;
            };

            var facade = new Facade();
            facade.constructor = Component;
            Component.prototype = facade;

            Component.$componentName = describe.componentName;
            Component.$identity = 'Constructor of Component ' + describe.componentName;
            return Component;
        },
        mount: function (spn, parent) {
//                paint(spn);
            var ele=tree(spn);
            console.log(ele);
            console.log(spn);
            parent.appendChild(ele)
        }
    };

    window.sparrow=sparrow;
})(window);