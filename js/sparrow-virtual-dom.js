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

    function _Sparrow() {
        this.version = '.0';
    }

    window.$components = {};
    _Sparrow.prototype.component = function (component) {
        var generator=new ComponentGenerator();
        generator.desc=component;
        generator._constructor=Component;
        return generator;
        /*var c = new Component(component);
        $components[c.componentName] = c;
        return c;*/
    };

    _Sparrow.prototype.node = function (type, prop, children) {
        return new Sparrow_Node(type, prop, children)
    };

    var DIFF = {
        CREATE: 'CREATE',
        CREATE_ALL: 'CREATE_ALL',
        DELETE: 'DELETE',
        DELETE_ALL: 'DELETE_ALL',
        UPDATE: 'UPDATE',
        UPDATE_PROP: 'UPDATE_PROP',
        REPLACE: 'REPLACE'
    };


    function isComponent(node) {
        return node instanceof Component
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

    function toDOMNode(node) {
        if (isString(node) || isNumber(node)) {
            return document.createTextNode(node)
        } else {
            return node.tree();
        }
    }

    /*diff*/
    function sameType(newType,oldType){
        if(isComponent(newType) && isComponent(oldType)){
            return newType.componentName===oldType.componentName
        }else if(isString(newType) && isString(oldType)){
            return newType===oldType
        }else{
            return false;
        }
    }
    _Sparrow.prototype.diff = function (newNode, oldNode, nodeLevel, nodeIndex, suffix) {
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
        if (!sameType(nt,ot)) {
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
                    /*both no children*/
                    if (!oc || !nc) {
                        changes = changes.concat(this.diff(nc, oc, nodeLevel, nodeIndex, true));
                    } else {
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
                    }
                }
            }
        }

        return changes;
    };

    _Sparrow.prototype.mount = function (spn, dom) {
        var componentDOM = spn.tree();
        dom.appendChild(componentDOM);
    };

    _Sparrow.prototype.nodeSync = function (mounted, diff) {
        console.log(mounted, diff);
        var readyDelete=[];
        for (var i = 0; i < diff.length; i++) {
            var diffType = diff[i].type,
                trace = diff[i].nodeIndex;
            var newValues = diff[i].newVal;
            var r = traceChild(mounted, trace);
            var child = r.child, parent = r.parent;
            switch (diffType) {
                case DIFF.CREATE :
                {
                    for (var ci = 0; ci < newValues.length; ci++) {
                        parent.appendChild(toDOMNode(newValues[ci]))
                    }
                    break;
                }
                case DIFF.CREATE_ALL:
                {
                    break;
                }
                case DIFF.DELETE:
                {
                    child.setAttribute('ready-delete',true);
                    //parent.removeChild(child);
                    readyDelete.push({p:parent,c:child});
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
                    parent.replaceChild(toDOMNode(newValues), child);
                    break;
                }
            }
        }
        each(readyDelete,function(item,i){
            item.p.removeChild(item.c)
        })
    };

    function Component(desc) {
        /*this._component = desc;
        this.prop = desc.defaultProp && desc.defaultProp() || {};
        this.state = desc.initialState && desc.initialState() || null;
        this.refs=Object.create(null);
        try {
            if (!desc.componentName) {
                throw 'you must give me a componentName';
            }
            this.componentName = desc.componentName;
        } catch (err) {
            console.error(err)
        } finally {

        }*/
        extend(this,desc);
        if(this.defaultProp){
            this.prop = this.defaultProp();
            delete this.defaultProp;
        }
        if(this.initialState){
            this.state=this.initialState();
            delete  this.initialState;
        }
        this.refs={};
        !this.prop && (this.prop={});
        //$components[this.componentName] = this;
        console.log(this)
    }

    function ComponentGenerator(){}

    ComponentGenerator.prototype.paint=function(){
        var componentInstance=new this._constructor(this.desc);
        return componentInstance.paint()
    };

    function childrenPaint(spn) {
        var component = spn.type;

        if (component instanceof Component) {
            spn._paintbrush = component.paint(spn.prop);
            delete spn.children;
        }
        if (typeof component === "string" && spn.children) {
            for (var i = 0; i < spn.children.length; i++) {
                var spn_c = spn.children[i];
                if (spn_c) {
                    spn_c.$componentOrigin = spn.$componentOrigin;
                    spn_c.$notTrace=true;
                    childrenPaint(spn_c);
                }
            }
        }
    }

    Component.prototype.paint = function (prop) {
        var spn = this.render(extend({}, this.prop, prop || {}), this.state);
        spn.$componentOrigin = this;
        childrenPaint(spn);
        this._cacheNode = spn;
        return spn;
    };

    Component.prototype.setState = function (state) {
        var eles = document.querySelectorAll('[data-component=' + this.componentName + ']');

        var oldNode = this._cacheNode,
            newNode;
        if (!this.state) this.state = {};
        extend(this.state, state);
        newNode = this.paint();
        //console.log(newNode);

        var diff = sparrow.diff(newNode, oldNode);
        //!!
        each(eles, function (ele, i) {
            sparrow.nodeSync(ele, diff)
        });
    };
    function Sparrow_Node(type, prop, children) {
        if(type instanceof ComponentGenerator){
            this.type = new type._constructor(type.desc);
        }else{
            this.type = type;
        }
        this.prop = prop;
        if (!isArray(children)) children = [children];
        this.children = children;
    }

    var eventReg = /^on\w+/;

    function resolveProp(spn,prop, ele) {
        var props = Object.keys(prop);
        props.forEach(function (name) {
            switch (true) {
                case eventReg.test(name):
                {
                    ele.addEventListener(name.slice(2).toLowerCase(), prop[name].bind(spn.$componentOrigin));
                    break;
                }
                case name === 'ref':
                {
                    //console.log(spn);
                    var component=spn.$componentOrigin;
                    component.refs[prop[name]]=ele;
                    break;
                }
                case name==='className':{
                    ele.classList.add(prop[name]);
                    break;
                }
                default:
                {
                    ele.setAttribute(name, prop[name])
                }
            }
        }.bind(this))
    }

    Sparrow_Node.prototype.tree = function () {
        var nodeType = this.type, children = this.children;
        var ele;
        if (nodeType instanceof Component) {
            ele = this._paintbrush.tree();
        } else {
            ele = document.createElement(nodeType);
            this.$componentOrigin && !this.$notTrace && ele.setAttribute('data-component', this.$componentOrigin.componentName);
            if (this.prop) {
                resolveProp(this,this.prop, ele);
            }
            if (children) {
                for (var i = 0; i < children.length; i++) {
                    var child = children[i];
                    if (isSimple(child)) {
                        ele.appendChild(document.createTextNode(child));
                    } else if (child) {
                        var r = child.tree();
                        r && ele.appendChild(r)
                    }
                }
            }
        }
        return ele;
    };

    window.sparrow = new _Sparrow();
})(window);