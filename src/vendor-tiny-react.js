const Fragment = Symbol('Fragment');

let scheduleRender = () => {};
let currentContext = null;
let hookIndex = 0;

function flattenChildren(children) {
  return children.flat(Infinity).filter((child) => child !== false && child !== true && child !== null && child !== undefined);
}

function createElement(type, props, ...children) {
  return {
    type,
    props: props || {},
    children: flattenChildren(children),
  };
}

function areHookDepsEqual(previousDeps, nextDeps) {
  if (!previousDeps || !nextDeps || previousDeps.length !== nextDeps.length) {
    return false;
  }

  return nextDeps.every((dependency, index) => Object.is(dependency, previousDeps[index]));
}

function useState(initialValue) {
  const context = currentContext;
  const stateIndex = hookIndex;
  hookIndex += 1;

  if (!context.hooks[stateIndex]) {
    context.hooks[stateIndex] = {
      value: typeof initialValue === 'function' ? initialValue() : initialValue,
    };
  }

  const setState = (nextValue) => {
    const hook = context.hooks[stateIndex];
    const resolvedValue = typeof nextValue === 'function' ? nextValue(hook.value) : nextValue;

    if (Object.is(resolvedValue, hook.value)) {
      return;
    }

    hook.value = resolvedValue;
    scheduleRender();
  };

  return [context.hooks[stateIndex].value, setState];
}

function useMemo(factory, deps) {
  const context = currentContext;
  const memoIndex = hookIndex;
  hookIndex += 1;
  const memo = context.hooks[memoIndex];

  if (memo && areHookDepsEqual(memo.deps, deps)) {
    return memo.value;
  }

  const value = factory();
  context.hooks[memoIndex] = { value, deps };
  return value;
}

function useEffect(effect, deps) {
  const context = currentContext;
  const effectIndex = hookIndex;
  hookIndex += 1;
  const previous = context.hooks[effectIndex];

  if (previous && areHookDepsEqual(previous.deps, deps)) {
    return;
  }

  context.pendingEffects.push(() => {
    previous?.cleanup?.();
    const cleanup = effect();
    context.hooks[effectIndex] = {
      deps,
      cleanup: typeof cleanup === 'function' ? cleanup : undefined,
    };
  });
}

function __setRenderScheduler(nextScheduleRender) {
  scheduleRender = nextScheduleRender;
}

function __withHookContext(context, renderComponent) {
  const previousContext = currentContext;
  const previousHookIndex = hookIndex;
  currentContext = context;
  hookIndex = 0;

  try {
    return renderComponent();
  } finally {
    currentContext = previousContext;
    hookIndex = previousHookIndex;
  }
}

const React = {
  Fragment,
  createElement,
  useEffect,
  useMemo,
  useState,
};

export { Fragment, createElement, useEffect, useMemo, useState, __setRenderScheduler, __withHookContext };
export default React;
