import{r,$ as T}from"./react-C0JOplFJ.js";import"./react-dom-CqXdU6rh.js";import{R as w}from"./react-router-B-SxGiBD.js";import{c as p}from"./@remix-run-DaH1AUis.js";/**
 * React Router DOM v6.22.3
 *
 * Copyright (c) Remix Software Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */const F="6";try{window.__reactRouterVersion=F}catch{}const U="startTransition",l=T[U];function _(t){let{basename:f,children:h,future:o,window:R}=t,s=r.useRef();s.current==null&&(s.current=p({window:R,v5Compat:!0}));let e=s.current,[n,i]=r.useState({action:e.action,location:e.location}),{v7_startTransition:c}=o||{},a=r.useCallback(u=>{c&&l?l(()=>i(u)):i(u)},[i,c]);return r.useLayoutEffect(()=>e.listen(a),[e,a]),r.createElement(w,{basename:f,children:h,location:n.location,navigationType:n.action,navigator:e,future:o})}var m;(function(t){t.UseScrollRestoration="useScrollRestoration",t.UseSubmit="useSubmit",t.UseSubmitFetcher="useSubmitFetcher",t.UseFetcher="useFetcher",t.useViewTransitionState="useViewTransitionState"})(m||(m={}));var S;(function(t){t.UseFetcher="useFetcher",t.UseFetchers="useFetchers",t.UseScrollRestoration="useScrollRestoration"})(S||(S={}));export{_ as B};
