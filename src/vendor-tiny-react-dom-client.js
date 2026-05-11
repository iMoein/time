import { __setRenderScheduler, __withHookContext } from './vendor-tiny-react.js';

const hookContexts = new Map();
const eventNamePattern = /^on[A-Z]/;
let activeRoot = null;
let renderQueued = false;
let pendingEffects = [];

function isTextVNode(value) {
  return typeof value === 'string' || typeof value === 'number';
}

function getHookContext(path) {
  if (!hookContexts.has(path)) {
    hookContexts.set(path, { hooks: [], pendingEffects: [] });
  }

  const context = hookContexts.get(path);
  context.pendingEffects = [];
  return context;
}

function changedType(previousVNode, nextVNode) {
  if (!previousVNode || !nextVNode) {
    return false;
  }

  if (isTextVNode(previousVNode) || isTextVNode(nextVNode)) {
    return isTextVNode(previousVNode) !== isTextVNode(nextVNode);
  }

  return previousVNode.type !== nextVNode.type;
}

function setStyle(dom, previousStyle = {}, nextStyle = {}) {
  Object.keys(previousStyle).forEach((name) => {
    if (!(name in nextStyle)) {
      dom.style[name] = '';
    }
  });

  Object.entries(nextStyle).forEach(([name, value]) => {
    dom.style[name] = value;
  });
}

function setAttribute(dom, name, value) {
  if (name === 'className') {
    dom.setAttribute('class', value);
    return;
  }

  if (name === 'htmlFor') {
    dom.setAttribute('for', value);
    return;
  }

  if (typeof value === 'boolean') {
    if (value) {
      dom.setAttribute(name, '');
    } else {
      dom.removeAttribute(name);
    }
    return;
  }

  dom.setAttribute(name, value);
}

function updateProps(dom, previousProps = {}, nextProps = {}) {
  dom.__listeners ||= {};

  Object.keys(previousProps).forEach((name) => {
    if (name === 'children' || name === 'key') {
      return;
    }

    if (eventNamePattern.test(name)) {
      const eventName = name.slice(2).toLowerCase();
      if (!nextProps[name] || previousProps[name] !== nextProps[name]) {
        dom.removeEventListener(eventName, dom.__listeners[name]);
        delete dom.__listeners[name];
      }
      return;
    }

    if (name === 'style') {
      setStyle(dom, previousProps.style, nextProps.style || {});
      return;
    }

    if (!(name in nextProps)) {
      if (name in dom) {
        try {
          dom[name] = '';
        } catch {
          // Fall back to removing the attribute below.
        }
      }
      dom.removeAttribute(name === 'className' ? 'class' : name);
    }
  });

  Object.entries(nextProps).forEach(([name, value]) => {
    if (name === 'children' || name === 'key' || value === null || value === undefined) {
      return;
    }

    if (eventNamePattern.test(name)) {
      const eventName = name.slice(2).toLowerCase();
      if (dom.__listeners[name] !== value) {
        if (dom.__listeners[name]) {
          dom.removeEventListener(eventName, dom.__listeners[name]);
        }
        dom.__listeners[name] = value;
        dom.addEventListener(eventName, value);
      }
      return;
    }

    if (name === 'style') {
      setStyle(dom, previousProps.style || {}, value || {});
      return;
    }

    if (name in dom && !name.startsWith('aria-') && !name.startsWith('data-')) {
      if (dom[name] !== value) {
        dom[name] = value;
      }
      return;
    }

    setAttribute(dom, name, value);
  });
}

function createDom(vNode, path) {
  if (isTextVNode(vNode)) {
    return document.createTextNode(String(vNode));
  }

  if (typeof vNode.type === 'function') {
    const childVNode = renderFunctionComponent(vNode, path);
    vNode.child = childVNode;
    vNode.dom = createDom(childVNode, `${path}.0`);
    return vNode.dom;
  }

  const dom = document.createElement(vNode.type);
  updateProps(dom, {}, vNode.props);
  vNode.children.forEach((child, index) => {
    dom.appendChild(createDom(child, `${path}.${index}`));
  });
  return dom;
}

function renderFunctionComponent(vNode, path) {
  const context = getHookContext(path);
  const childVNode = __withHookContext(context, () => vNode.type({ ...vNode.props, children: vNode.children }));
  pendingEffects.push(...context.pendingEffects);
  return childVNode;
}

function reconcile(parent, previousVNode, nextVNode, index, path) {
  if (nextVNode === null || nextVNode === undefined || nextVNode === false) {
    if (previousVNode?.dom) {
      parent.removeChild(previousVNode.dom);
    }
    return null;
  }

  if (!previousVNode) {
    const dom = createDom(nextVNode, path);
    parent.appendChild(dom);
    if (!isTextVNode(nextVNode)) {
      nextVNode.dom = dom;
    }
    return nextVNode;
  }

  if (changedType(previousVNode, nextVNode)) {
    const dom = createDom(nextVNode, path);
    parent.replaceChild(dom, previousVNode.dom);
    if (!isTextVNode(nextVNode)) {
      nextVNode.dom = dom;
    }
    return nextVNode;
  }

  if (isTextVNode(nextVNode)) {
    const dom = previousVNode.dom || parent.childNodes[index];
    if (dom.nodeValue !== String(nextVNode)) {
      dom.nodeValue = String(nextVNode);
    }
    return { dom, value: nextVNode };
  }

  if (typeof nextVNode.type === 'function') {
    const childVNode = renderFunctionComponent(nextVNode, path);
    const reconciledChild = reconcile(parent, previousVNode.child, childVNode, index, `${path}.0`);
    nextVNode.child = reconciledChild;
    nextVNode.dom = reconciledChild?.dom;
    return nextVNode;
  }

  const dom = previousVNode.dom;
  nextVNode.dom = dom;
  updateProps(dom, previousVNode.props, nextVNode.props);

  const maxLength = Math.max(previousVNode.children.length, nextVNode.children.length);
  const nextChildren = [];

  for (let childIndex = 0; childIndex < maxLength; childIndex += 1) {
    const reconciledChild = reconcile(
      dom,
      previousVNode.children[childIndex],
      nextVNode.children[childIndex],
      childIndex,
      `${path}.${childIndex}`,
    );

    if (reconciledChild) {
      nextChildren.push(reconciledChild);
    }
  }

  nextVNode.children = nextChildren;
  return nextVNode;
}

function flushEffects() {
  const effects = pendingEffects;
  pendingEffects = [];
  effects.forEach((effect) => effect());
}

function performRender() {
  if (!activeRoot) {
    return;
  }

  renderQueued = false;
  activeRoot.vNode = reconcile(activeRoot.container, activeRoot.vNode, activeRoot.element, 0, '0');
  flushEffects();
}

function scheduleRender() {
  if (renderQueued) {
    return;
  }

  renderQueued = true;
  queueMicrotask(performRender);
}

function createRoot(container) {
  return {
    render(element) {
      activeRoot = { container, element, vNode: activeRoot?.container === container ? activeRoot.vNode : null };
      __setRenderScheduler(scheduleRender);
      performRender();
    },
  };
}

export { createRoot };
