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
        if (items) {
            for (var i = 0; i < items.length; i++) {
                iterator(items[i], i)
            }
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
        return typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean'
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
        var parent, child;
        var index = 0;
        child = parent = ele;
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

    function toDOMNode(node, component) {
        if (isString(node) || isNumber(node)) {
            return document.createTextNode(node)
        } else {
            return tree(node, component);
        }
    }

    function nodeSync(mounted, diff, component) {
        //console.log(mounted, diff);
        var readyDelete = [];
        for (var i = 0; i < diff.length; i++) {
            var diffType = diff[i].type,
                trace = diff[i].nodeIndex + '';
            var newValues = diff[i].newVal;
            var r = traceChild(mounted, trace);
            var child = r.child, parent = r.parent;
            switch (diffType) {
                case DIFF.CREATE :
                {
                    for (var ci = 0; ci < newValues.length; ci++) {
                        parent.appendChild(toDOMNode(newValues[ci], component))
                    }
                    break;
                }
                case DIFF.CREATE_ALL:
                {
                    break;
                }
                case DIFF.DELETE:
                {
                    try {
                        child.setAttribute('ready-delete', true);
                    } catch (err) {
                        console.error(err.name + ':' + err.message)
                    } finally {
                        readyDelete.push({p: parent, c: child});
                    }
                    break;
                    //parent.removeChild(child);
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
                    var keys = Object.keys(newValues);
                    each(keys, function (key) {
                        child.setAttribute(key, newValues[key])
                    });
                    break;
                }
                case DIFF.REPLACE:
                {
                    if (trace === '0') {
                        var newDOM = toDOMNode(newValues, component);
                        parent.parentNode.replaceChild(newDOM, parent);
                        component.$renderedDOM = newDOM;
                    } else {
                        parent.replaceChild(toDOMNode(newValues, component), child);
                    }
                    break;
                }
            }
        }
        each(readyDelete, function (item, i) {
            item.p.removeChild(item.c)
        })
    }

    function diffProp(newNode, oldNode, nodeLevel, nodeIndex, changes) {
        var np = newNode.prop, op = oldNode.prop;
        var np_props = Object.keys(np || {}), op_props = Object.keys(op || {});
        var diff = {}, hasDiff = false;
        each(np_props, function (pName) {
            if (np[pName] !== op[pName]) {
                hasDiff = true;
                diff[pName] = np[pName]
            }
        });
        hasDiff && changes.push(new Diff(DIFF.UPDATE_PROP, nodeLevel, nodeIndex, diff))
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
                    diffProp(newNode, oldNode, nodeLevel, nodeIndex, changes);
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

    function SparrowNode(type,prop,children) {
        this.type=type;
        this.prop=prop;
        this.children=children;
    }

    function initialTraceAndAdd(parentComponent, componentName, component) {
        var cps = parentComponent._traceChildrenComponent;
        if (!cps[componentName]) {
            cps[componentName] = [];
            cps[componentName].currentIndex = 0;
        }
        cps[componentName].push(component)
    }

    function createComponentAndTrace(type, parentComponent, spn) {
        var component = new type(), componentName = type.$componentName;
        spn._generatedByComponent = component;
        extend(component.prop, spn.prop || {});
        var node = spn._paintbrush = component.render();
        delete spn.children;
        parentComponent && initialTraceAndAdd(parentComponent, componentName, component);
        component._cacheNode = spn;
        return {node: node, component: component}
    }

    SparrowNode.prototype.firstPaint = function (parentComponent) {
        var type = this.type, prop = this.prop;
        var r;
        if (isComponent(type)) {
            r = createComponentAndTrace(type, parentComponent, this);
            r.node.firstPaint(r.component);
        } else if (isString(type)) {
            each(this.children, function (child, i) {
                if (!isSimple(child)) {
                    child.firstPaint(parentComponent)
                }
            });
        }
        //this.painted = true;
        return this;
    };
    SparrowNode.prototype.subsequentPaint = function (parentComponent, ifChild) {
        var type = this.type, prop = this.prop;
        if (isComponent(type)) {
            var componentName = type.$componentName, component
                , cc, node, r;
            var cps = parentComponent._traceChildrenComponent;//childrenComponents
            if (cc = cps[componentName]) {//array consist of childComponent
                component = cc[cc.currentIndex++];
                if (component) {
                    this._generatedByComponent = component;
                    extend(component.prop, prop || {});
                    node = this._paintbrush = component.render();
                    delete this.children;

                    component._cacheNode = this;
                    node.subsequentPaint(component)
                } else {
                    r = createComponentAndTrace(type, parentComponent, this);
                    r.node.subsequentPaint(r.component);
                }
            } else {
                r = createComponentAndTrace(type, parentComponent, this);
                r.node.subsequentPaint(r.component);
            }
        } else if (isString(type)) {
            each(this.children, function (child, i) {
                if (!isSimple(child)) {
                    child.subsequentPaint(parentComponent, true)
                }
            });
            if (!ifChild) {
                var components = Object.keys(parentComponent._traceChildrenComponent);
                each(components, function (c, i) {
                    var trace = parentComponent._traceChildrenComponent[c], index = trace.currentIndex;
                    if (index < trace.length) {
                        trace.splice(index)
                    }
                    parentComponent._traceChildrenComponent[c].currentIndex = 0;

                });
            }
        }
        //this.painted = true;

        return this;
    };

    function Facade() {
//            extend(this,obj)
        this.uuidFromProto = {
            uuid: 0
        }
    }

    Facade.prototype = {
        constructor: Facade,
        setState: function (newState) {
            var oldNode = this.render().subsequentPaint(this);//这一步可能有问题
            extend(this.state, newState);
            var newNode = this.render().subsequentPaint(this);
            //console.log(oldNode, newNode);
            var diffs = diffTwoNodes(newNode, oldNode);
            nodeSync(this.$renderedDOM, diffs, this)
        },
        current: function () {
            return this.render().subsequentPaint(this);
        },
        update: function (newNode, oldNode) {
            var diffs = diffTwoNodes(newNode, oldNode);
            nodeSync(this.$renderedDOM, diffs, this)
        },
        call: function (mName, service, data) {
            var _this = this
                , messenger = postOffice[mName]
                , services = messenger.services
                , components = messenger.connectedComponent;
            var olds = [];
            each(components, function (component, i) {
                var old = component.current();
                olds.push({
                    c: component,
                    o: old
                });
            });
            services[service](data, _this);
            each(olds, function (old) {
                var n = old.c.current();
                old.c.update(n, old.o)
            })

        }
    };

    var uuid = 0;

    var eventReg = /^on\w+/;

    function resolveProp(prop, ele, component) {
        var propsNames = Object.keys(prop);
        each(propsNames, function (name, i) {
            switch (true) {
                case eventReg.test(name):
                {
                    ele.addEventListener(name.slice(2).toLowerCase(), prop[name].bind(component));
                    break;
                }
                case name === 'ref':
                {
                    //console.log(spn);
                    component.refs[prop[name]] = ele;
                    break;
                }
                case name === 'className':
                {
                    var values = prop[name], val = values.split(' ');
                    each(val, function (v) {
                        ele.classList.add(v)
                    });
                    break;
                }
                case name==='style':
                {
                    var style=prop.style;
                    var style_keys=Object.keys(style);
                    for(var si=0;si<style_keys.length;si++){
                        ele.style[style_keys[si]]=style[style_keys[si]]
                    }
                    break;
                }
                default:
                {
                    ele.setAttribute(name, prop[name])
                }
            }
        });
    }

    /*转换成实际的DOM*/
    function tree(spn, parentComponent) {
        //console.log(spn);
        var ele;
        if (typeof spn === 'string') {
            ele = document.createTextNode(spn);
        }
        var type = spn.type, prop, attr, children = spn.children;
        prop = attr = spn.prop;
        if (isComponent(type)) {
            var component = spn._generatedByComponent;
            ele = tree(spn._paintbrush, component);
            component.$renderedDOM = ele;

            if(type.didMount){
                spn.type.didMount.call(component,ele,spn.prop)
            }
        }
        if (isString(type)) {
            ele = document.createElement(type);
            prop && resolveProp(prop, ele, parentComponent);
            each(children, function (child, i) {
                ele.appendChild(tree(child, parentComponent))
            });
            /*            if (attr && attr.onClick) {
             ele.addEventListener('click', attr.onClick.bind(parentComponent))
             }*/
        }

        return ele;
    }

    var postOffice = {};

    function Messenger(data) {
        this.connectedComponent = [];
        this.services = {};
        extend(this, data);
    }

    Messenger.prototype.wait = function (service, callback) {
        //this.allow
        var services = this.services;
        services[service] = callback.bind(this);
        return this;
    };

    Messenger.prototype.connect = function (component) {
        this.connectedComponent.push(component);
    };

    function Sparrow() {
        this.version = '1.2';
        this.createComponent = function (describe) {
            var Component = function () {
                extend(this, describe);
                /**/
                this.state = this.initialState && this.initialState() || {};
                this.prop = this.defaultProp && this.defaultProp() || {};

                this.willMount && this.willMount();
                
                var ufp = this.uuidFromProto;
                this.$traceId = this.componentName + '-' + ufp.uuid++;
                this._traceChildrenComponent = Object.create(null);
                this.refs = Object.create(null);

                //console.log(this);
                delete this.initialState;
                delete this.defaultProp;
                // delete this.willMount;
            };
            
            if(describe.didMount) Component.didMount=describe.didMount;
            var facade = new Facade();
            facade.constructor = Component;
            Component.prototype = facade;

            Component.$componentName = describe.componentName;
//                Component.$identity = 'Constructor of Component ' + describe.componentName;
            return Component;
        };
        this.mount = function (spn, parent, fn) {
            try {
                var ele = tree(spn.firstPaint());
                while (parent.firstChild) {
                    parent.removeChild(parent.firstChild);
                }
                parent.appendChild(ele);
            } catch (e) {
                //
            } finally {
                fn && fn();
            }
        };
        this.createNode = function (type, prop, children) {
            if (children && !isArray(children)) {
                children = [children]
            }

            var filterChildren = [];
            each(children, function (child) {
                if (child !== null && child !== undefined) filterChildren.push(child)
            });

            return new SparrowNode(type,prop,filterChildren);
        };
        this.defineMessenger = function (source) {
            var name = source.name;
            if (!name) {
                console.error('you must give name of this messenger');
                return;
            }
            var data = source.data
                , methods = source.methods;
            return postOffice[name] = new Messenger({name: name, data: data, methods: methods});
        };
        this.copy = function (obj) {
            return JSON.parse(JSON.stringify(obj))
        };
        this.each = each;
    }

    window.sparrow = new Sparrow();
})(window);