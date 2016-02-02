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

    function traceChild(ele, trace) {
        var traceArr = trace.split('-').slice(1);
        var child = parent = ele, index = 0;
        while (index < traceArr.length) {
            parent = child;
            child = child.childNodes[traceArr[index]];
            index++;
        }
        return {
            parent: parent,
            child: child
        }
    }

    function toDOMNode(node,component) {
        if (isString(node) || isNumber(node)) {
            return document.createTextNode(node)
        } else {
            return tree(node,component);
        }
    }

    function nodeSync(mounted, diff,component) {
        console.log(mounted, diff);
        var readyDelete = [];
        for (var i = 0; i < diff.length; i++) {
            var diffType = diff[i].type,
                trace = diff[i].nodeIndex+'';
            var newValues = diff[i].newVal;
            var r = traceChild(mounted, trace);
            var child = r.child, parent = r.parent;
            switch (diffType) {
                case DIFF.CREATE :
                {
                    for (var ci = 0; ci < newValues.length; ci++) {
                        parent.appendChild(toDOMNode(newValues[ci],component))
                    }
                    break;
                }
                case DIFF.CREATE_ALL:
                {
                    break;
                }
                case DIFF.DELETE:
                {
                    child.setAttribute('ready-delete', true);
                    //parent.removeChild(child);
                    readyDelete.push({p: parent, c: child});
                    break;
                }
                case DIFF.DELETE_ALL:
                {
                    break;
                }
                case DIFF.UPDATE:
                {
                    child.data = diff[i].newVal;
                    break;
                }
                case DIFF.UPDATE_PROP:
                {
                    break;
                }
                case DIFF.REPLACE:
                {
                    if(trace==='0'){
                        var newDOM=toDOMNode(newValues,component);
                        parent.parentNode.replaceChild(newDOM,parent);
                        component.$renderedDOM=newDOM;
                    }else{
                        parent.replaceChild(toDOMNode(newValues,component), child);
                    }
                    break;
                }
            }
        }
        each(readyDelete, function (item, i) {
            item.p.removeChild(item.c)
        })
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

    SparrowNode.prototype.paint=function(){
        var type=this.type,prop=this.prop;
        if(isComponent(type)){
            var component=new type();
            extend(component.prop, prop || {});
            console.log(component);
            var node=this._paintbrush=component.render();
            this._generatedComponent=component;
            delete this.children;
            node.paint();
        }else if(isString(type)){
            var children=this.children;
            for(var i=0;i<children.length;i++){
                var child=children[i];
                if(!isSimple(child)){
                    child.paint()
                }
            }
        }
        return this;
    };

    function node(type, prop, children) {
        var node = new SparrowNode();
        node.type = type;
        node.prop = prop;

        if (children && !isArray(children)) {
            children = [children]
        }
        node.children = children;
        return node;
    }

    function Facade() {
//            extend(this,obj)
        this.uuidFromProto={
            uuid:0
        }
    }

    Facade.prototype = {
        constructor: Facade,
        setState: function (newState) {
//                console.log(this)
            var oldNode = this.render().paint();//这一步可能有问题
            extend(this.state, newState);
            var newNode = this.render().paint();
            var diffs = diffTwoNodes(newNode, oldNode);
//                console.log(diffs)
            nodeSync(this.$renderedDOM, diffs,this)
        }
    };

    var uuid = 0;
    function tree(spn, parentComponent) {
        var ele;
        if (typeof spn === 'string') {
            ele = document.createTextNode(spn);
        }
        var type = spn.type, prop, attr, children = spn.children;
        prop = attr = spn.prop;
        if (isComponent(type)) {
            var component=spn._generatedComponent;
            ele=tree(spn._paintbrush,component);
            component.$renderedDOM=ele;
        }
        if (isString(type)) {
            ele = document.createElement(type);
            each(children, function (child, i) {
                ele.appendChild(tree(child,parentComponent))
            });
            if (attr && attr.onClick) {
                ele.addEventListener('click', attr.onClick.bind(parentComponent))
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

                var ufp=this.uuidFromProto;
                this.$traceId=this.componentName+'-'+ufp.uuid++;
                this._traceChildren=[];
                delete this.initialState;
                delete this.defaultProp;
            };

            var facade = new Facade();
            facade.constructor = Component;
            Component.prototype = facade;

            Component.$componentName = describe.componentName;
//                Component.$identity = 'Constructor of Component ' + describe.componentName;
            return Component;
        },
        mount: function (spn, parent) {
            var ele = tree(spn.paint());
//                console.log(ele);
//                console.log(spn);
            parent.appendChild(ele)
        }
    };
})(window);