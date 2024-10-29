/*! For license information please see vectorvault.bundle.js.LICENSE.txt */
!function(e,t){"object"==typeof exports&&"object"==typeof module?module.exports=t():"function"==typeof define&&define.amd?define("VectorVault",[],t):"object"==typeof exports?exports.VectorVault=t():e.VectorVault=t()}("undefined"!=typeof self?self:this,(()=>(()=>{"use strict";var e={d:(t,r)=>{for(var n in r)e.o(r,n)&&!e.o(t,n)&&Object.defineProperty(t,n,{enumerable:!0,get:r[n]})},o:(e,t)=>Object.prototype.hasOwnProperty.call(e,t),r:e=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})}},t={};function r(e){return r="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e},r(e)}function n(e,t){var r="undefined"!=typeof Symbol&&e[Symbol.iterator]||e["@@iterator"];if(!r){if(Array.isArray(e)||(r=function(e,t){if(e){if("string"==typeof e)return o(e,t);var r={}.toString.call(e).slice(8,-1);return"Object"===r&&e.constructor&&(r=e.constructor.name),"Map"===r||"Set"===r?Array.from(e):"Arguments"===r||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r)?o(e,t):void 0}}(e))||t&&e&&"number"==typeof e.length){r&&(e=r);var n=0,a=function(){};return{s:a,n:function(){return n>=e.length?{done:!0}:{done:!1,value:e[n++]}},e:function(e){throw e},f:a}}throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}var s,i=!0,u=!1;return{s:function(){r=r.call(e)},n:function(){var e=r.next();return i=e.done,e},e:function(e){u=!0,s=e},f:function(){try{i||null==r.return||r.return()}finally{if(u)throw s}}}}function o(e,t){(null==t||t>e.length)&&(t=e.length);for(var r=0,n=Array(t);r<t;r++)n[r]=e[r];return n}function a(e,t){var r=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),r.push.apply(r,n)}return r}function s(e){for(var t=1;t<arguments.length;t++){var r=null!=arguments[t]?arguments[t]:{};t%2?a(Object(r),!0).forEach((function(t){i(e,t,r[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(r)):a(Object(r)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(r,t))}))}return e}function i(e,t,r){return(t=f(t))in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r,e}function u(){u=function(){return t};var e,t={},n=Object.prototype,o=n.hasOwnProperty,a=Object.defineProperty||function(e,t,r){e[t]=r.value},s="function"==typeof Symbol?Symbol:{},i=s.iterator||"@@iterator",c=s.asyncIterator||"@@asyncIterator",l=s.toStringTag||"@@toStringTag";function h(e,t,r){return Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}),e[t]}try{h({},"")}catch(e){h=function(e,t,r){return e[t]=r}}function f(e,t,r,n){var o=t&&t.prototype instanceof g?t:g,s=Object.create(o.prototype),i=new L(n||[]);return a(s,"_invoke",{value:P(e,r,i)}),s}function p(e,t,r){try{return{type:"normal",arg:e.call(t,r)}}catch(e){return{type:"throw",arg:e}}}t.wrap=f;var d="suspendedStart",y="suspendedYield",m="executing",v="completed",b={};function g(){}function k(){}function x(){}var w={};h(w,i,(function(){return this}));var O=Object.getPrototypeOf,_=O&&O(O(J([])));_&&_!==n&&o.call(_,i)&&(w=_);var S=x.prototype=g.prototype=Object.create(w);function j(e){["next","throw","return"].forEach((function(t){h(e,t,(function(e){return this._invoke(t,e)}))}))}function T(e,t){function n(a,s,i,u){var c=p(e[a],e,s);if("throw"!==c.type){var l=c.arg,h=l.value;return h&&"object"==r(h)&&o.call(h,"__await")?t.resolve(h.__await).then((function(e){n("next",e,i,u)}),(function(e){n("throw",e,i,u)})):t.resolve(h).then((function(e){l.value=e,i(l)}),(function(e){return n("throw",e,i,u)}))}u(c.arg)}var s;a(this,"_invoke",{value:function(e,r){function o(){return new t((function(t,o){n(e,r,t,o)}))}return s=s?s.then(o,o):o()}})}function P(t,r,n){var o=d;return function(a,s){if(o===m)throw Error("Generator is already running");if(o===v){if("throw"===a)throw s;return{value:e,done:!0}}for(n.method=a,n.arg=s;;){var i=n.delegate;if(i){var u=A(i,n);if(u){if(u===b)continue;return u}}if("next"===n.method)n.sent=n._sent=n.arg;else if("throw"===n.method){if(o===d)throw o=v,n.arg;n.dispatchException(n.arg)}else"return"===n.method&&n.abrupt("return",n.arg);o=m;var c=p(t,r,n);if("normal"===c.type){if(o=n.done?v:y,c.arg===b)continue;return{value:c.arg,done:n.done}}"throw"===c.type&&(o=v,n.method="throw",n.arg=c.arg)}}}function A(t,r){var n=r.method,o=t.iterator[n];if(o===e)return r.delegate=null,"throw"===n&&t.iterator.return&&(r.method="return",r.arg=e,A(t,r),"throw"===r.method)||"return"!==n&&(r.method="throw",r.arg=new TypeError("The iterator does not provide a '"+n+"' method")),b;var a=p(o,t.iterator,r.arg);if("throw"===a.type)return r.method="throw",r.arg=a.arg,r.delegate=null,b;var s=a.arg;return s?s.done?(r[t.resultName]=s.value,r.next=t.nextLoc,"return"!==r.method&&(r.method="next",r.arg=e),r.delegate=null,b):s:(r.method="throw",r.arg=new TypeError("iterator result is not an object"),r.delegate=null,b)}function E(e){var t={tryLoc:e[0]};1 in e&&(t.catchLoc=e[1]),2 in e&&(t.finallyLoc=e[2],t.afterLoc=e[3]),this.tryEntries.push(t)}function N(e){var t=e.completion||{};t.type="normal",delete t.arg,e.completion=t}function L(e){this.tryEntries=[{tryLoc:"root"}],e.forEach(E,this),this.reset(!0)}function J(t){if(t||""===t){var n=t[i];if(n)return n.call(t);if("function"==typeof t.next)return t;if(!isNaN(t.length)){var a=-1,s=function r(){for(;++a<t.length;)if(o.call(t,a))return r.value=t[a],r.done=!1,r;return r.value=e,r.done=!0,r};return s.next=s}}throw new TypeError(r(t)+" is not iterable")}return k.prototype=x,a(S,"constructor",{value:x,configurable:!0}),a(x,"constructor",{value:k,configurable:!0}),k.displayName=h(x,l,"GeneratorFunction"),t.isGeneratorFunction=function(e){var t="function"==typeof e&&e.constructor;return!!t&&(t===k||"GeneratorFunction"===(t.displayName||t.name))},t.mark=function(e){return Object.setPrototypeOf?Object.setPrototypeOf(e,x):(e.__proto__=x,h(e,l,"GeneratorFunction")),e.prototype=Object.create(S),e},t.awrap=function(e){return{__await:e}},j(T.prototype),h(T.prototype,c,(function(){return this})),t.AsyncIterator=T,t.async=function(e,r,n,o,a){void 0===a&&(a=Promise);var s=new T(f(e,r,n,o),a);return t.isGeneratorFunction(r)?s:s.next().then((function(e){return e.done?e.value:s.next()}))},j(S),h(S,l,"Generator"),h(S,i,(function(){return this})),h(S,"toString",(function(){return"[object Generator]"})),t.keys=function(e){var t=Object(e),r=[];for(var n in t)r.push(n);return r.reverse(),function e(){for(;r.length;){var n=r.pop();if(n in t)return e.value=n,e.done=!1,e}return e.done=!0,e}},t.values=J,L.prototype={constructor:L,reset:function(t){if(this.prev=0,this.next=0,this.sent=this._sent=e,this.done=!1,this.delegate=null,this.method="next",this.arg=e,this.tryEntries.forEach(N),!t)for(var r in this)"t"===r.charAt(0)&&o.call(this,r)&&!isNaN(+r.slice(1))&&(this[r]=e)},stop:function(){this.done=!0;var e=this.tryEntries[0].completion;if("throw"===e.type)throw e.arg;return this.rval},dispatchException:function(t){if(this.done)throw t;var r=this;function n(n,o){return i.type="throw",i.arg=t,r.next=n,o&&(r.method="next",r.arg=e),!!o}for(var a=this.tryEntries.length-1;a>=0;--a){var s=this.tryEntries[a],i=s.completion;if("root"===s.tryLoc)return n("end");if(s.tryLoc<=this.prev){var u=o.call(s,"catchLoc"),c=o.call(s,"finallyLoc");if(u&&c){if(this.prev<s.catchLoc)return n(s.catchLoc,!0);if(this.prev<s.finallyLoc)return n(s.finallyLoc)}else if(u){if(this.prev<s.catchLoc)return n(s.catchLoc,!0)}else{if(!c)throw Error("try statement without catch or finally");if(this.prev<s.finallyLoc)return n(s.finallyLoc)}}}},abrupt:function(e,t){for(var r=this.tryEntries.length-1;r>=0;--r){var n=this.tryEntries[r];if(n.tryLoc<=this.prev&&o.call(n,"finallyLoc")&&this.prev<n.finallyLoc){var a=n;break}}a&&("break"===e||"continue"===e)&&a.tryLoc<=t&&t<=a.finallyLoc&&(a=null);var s=a?a.completion:{};return s.type=e,s.arg=t,a?(this.method="next",this.next=a.finallyLoc,b):this.complete(s)},complete:function(e,t){if("throw"===e.type)throw e.arg;return"break"===e.type||"continue"===e.type?this.next=e.arg:"return"===e.type?(this.rval=this.arg=e.arg,this.method="return",this.next="end"):"normal"===e.type&&t&&(this.next=t),b},finish:function(e){for(var t=this.tryEntries.length-1;t>=0;--t){var r=this.tryEntries[t];if(r.finallyLoc===e)return this.complete(r.completion,r.afterLoc),N(r),b}},catch:function(e){for(var t=this.tryEntries.length-1;t>=0;--t){var r=this.tryEntries[t];if(r.tryLoc===e){var n=r.completion;if("throw"===n.type){var o=n.arg;N(r)}return o}}throw Error("illegal catch attempt")},delegateYield:function(t,r,n){return this.delegate={iterator:J(t),resultName:r,nextLoc:n},"next"===this.method&&(this.arg=e),b}},t}function c(e,t,r,n,o,a,s){try{var i=e[a](s),u=i.value}catch(e){return void r(e)}i.done?t(u):Promise.resolve(u).then(n,o)}function l(e){return function(){var t=this,r=arguments;return new Promise((function(n,o){var a=e.apply(t,r);function s(e){c(a,n,o,s,i,"next",e)}function i(e){c(a,n,o,s,i,"throw",e)}s(void 0)}))}}function h(e,t){for(var r=0;r<t.length;r++){var n=t[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(e,f(n.key),n)}}function f(e){var t=function(e){if("object"!=r(e)||!e)return e;var t=e[Symbol.toPrimitive];if(void 0!==t){var n=t.call(e,"string");if("object"!=r(n))return n;throw new TypeError("@@toPrimitive must return a primitive value.")}return String(e)}(e);return"symbol"==r(t)?t:t+""}e.r(t),e.d(t,{default:()=>p});var p=function(){return e=function e(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:null;!function(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}(this,e),this.embeddingsModel=t,this.accessToken=null,this.refreshToken=null,this.tokenExpiresAt=null,this.baseUrl="https://api.vectorvault.io"},t=[{key:"login",value:(N=l(u().mark((function e(t,r){var n,o,a,s,i,c;return u().wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return n="".concat(this.baseUrl,"/login"),o={email:t,password:r},e.next=4,fetch(n,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(o)});case 4:if(!(a=e.sent).ok){e.next=15;break}return e.next=8,a.json();case 8:s=e.sent,this.accessToken=s.access_token,this.refreshToken=s.refresh_token,i=JSON.parse(atob(this.accessToken.split(".")[1])),this.tokenExpiresAt=1e3*i.exp,e.next=19;break;case 15:return e.next=17,a.json();case 17:throw c=e.sent,new Error("Login failed: "+c.error);case 19:case"end":return e.stop()}}),e,this)}))),function(e,t){return N.apply(this,arguments)})},{key:"loginAPI",value:(E=l(u().mark((function e(t,r){var n,o,a,s,i,c;return u().wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return n="".concat(this.baseUrl,"/login_with_api"),o={email:t,api_key:r},e.next=4,fetch(n,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(o)});case 4:if(!(a=e.sent).ok){e.next=15;break}return e.next=8,a.json();case 8:s=e.sent,this.accessToken=s.access_token,this.refreshToken=s.refresh_token,i=JSON.parse(atob(this.accessToken.split(".")[1])),this.tokenExpiresAt=1e3*i.exp,e.next=19;break;case 15:return e.next=17,a.json();case 17:throw c=e.sent,new Error("API Key Login failed: "+c.error);case 19:case"end":return e.stop()}}),e,this)}))),function(e,t){return E.apply(this,arguments)})},{key:"refreshAccessToken",value:(A=l(u().mark((function e(){var t,r,n,o,a;return u().wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return t="".concat(this.baseUrl,"/refresh"),r={refresh_token:this.refreshToken},e.next=4,fetch(t,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(r)});case 4:if(!(n=e.sent).ok){e.next=15;break}return e.next=8,n.json();case 8:return o=e.sent,this.accessToken=o.access_token,a=JSON.parse(atob(this.accessToken.split(".")[1])),this.tokenExpiresAt=1e3*a.exp,e.abrupt("return",!0);case 15:return this.accessToken=null,this.refreshToken=null,this.tokenExpiresAt=null,e.abrupt("return",!1);case 19:case"end":return e.stop()}}),e,this)}))),function(){return A.apply(this,arguments)})},{key:"makeAuthenticatedRequest",value:(P=l(u().mark((function e(t){var r,n,o,a,s,i,c=arguments;return u().wrap((function(e){for(;;)switch(e.prev=e.next){case 0:if(r=c.length>1&&void 0!==c[1]?c[1]:{},n=Date.now(),!(this.tokenExpiresAt-n<6e4)){e.next=8;break}return e.next=5,this.refreshAccessToken();case 5:if(e.sent){e.next=8;break}throw new Error("Session expired. Please log in again.");case 8:return r.headers=r.headers||{},r.headers.Authorization="Bearer ".concat(this.accessToken),r.headers["Content-Type"]="application/json",e.next=13,fetch(t,r);case 13:if(!(o=e.sent).ok){e.next=18;break}return e.abrupt("return",o);case 18:if(401!==o.status){e.next=40;break}return e.next=21,this.refreshAccessToken();case 21:if(!e.sent){e.next=37;break}return r.headers.Authorization="Bearer ".concat(this.accessToken),e.next=26,fetch(t,r);case 26:if(!(a=e.sent).ok){e.next=31;break}return e.abrupt("return",a);case 31:return e.next=33,a.json();case 33:throw s=e.sent,new Error("Request failed: ".concat(s.error));case 35:e.next=38;break;case 37:throw new Error("Session expired. Please log in again.");case 38:e.next=44;break;case 40:return e.next=42,o.json();case 42:throw i=e.sent,new Error("Request failed: ".concat(i.error));case 44:case"end":return e.stop()}}),e,this)}))),function(e){return P.apply(this,arguments)})},{key:"getAccessToken",value:function(){return this.accessToken}},{key:"getRefreshToken",value:function(){return this.refreshToken}},{key:"setAccessToken",value:function(e){this.accessToken=e;var t=JSON.parse(atob(e.split(".")[1]));this.tokenExpiresAt=1e3*t.exp}},{key:"setRefreshToken",value:function(e){this.refreshToken=e}},{key:"getChat",value:(T=l(u().mark((function e(t){var r,n,o;return u().wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return r="".concat(this.baseUrl,"/get_chat"),n=s({vault:"",embeddings_model:this.embeddingsModel,text:"",history:null,summary:!1,get_context:!1,n_context:4,return_context:!1,smart_history_search:!1,model:"gpt-4o",include_context_meta:!1,custom_prompt:!1,temperature:0,timeout:45},t),e.next=4,this.makeAuthenticatedRequest(r,{method:"POST",body:JSON.stringify(n)});case 4:return o=e.sent,e.abrupt("return",o.json());case 6:case"end":return e.stop()}}),e,this)}))),function(e){return T.apply(this,arguments)})},{key:"getChatStream",value:(j=l(u().mark((function e(t,r){var o,a,i,c,l,h,f,p,d,y,m,v,b,g,k;return u().wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return o="".concat(this.baseUrl,"/stream"),a=s({vault:"",embeddings_model:this.embeddingsModel,text:"",history:null,summary:!1,get_context:!1,n_context:4,return_context:!1,smart_history_search:!1,model:"gpt-4o",include_context_meta:!1,metatag:[],metatag_prefixes:[],metatag_suffixes:[],custom_prompt:!1,temperature:0,timeout:45},t),e.next=4,this.makeAuthenticatedRequest(o,{method:"POST",body:JSON.stringify(a)});case 4:i=e.sent,c=i.body.getReader(),l=new TextDecoder("utf-8");case 7:return e.next=10,c.read();case 10:if(h=e.sent,f=h.done,p=h.value,!f){e.next=15;break}return e.abrupt("break",21);case 15:d=l.decode(p,{stream:!0}),y=d.split("\n"),m=n(y);try{for(m.s();!(v=m.n()).done;)(b=v.value).startsWith("data:")&&(g=JSON.parse(b.substring(6)),k=g.data,r(k))}catch(e){m.e(e)}finally{m.f()}e.next=7;break;case 21:case"end":return e.stop()}}),e,this)}))),function(e,t){return j.apply(this,arguments)})},{key:"downloadToJson",value:(S=l(u().mark((function e(t){var r,n,o;return u().wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return r="".concat(this.baseUrl,"/download_to_json"),n=s({vault:"",return_meta:!1},t),e.next=4,this.makeAuthenticatedRequest(r,{method:"POST",body:JSON.stringify(n)});case 4:return o=e.sent,e.abrupt("return",o.json());case 6:case"end":return e.stop()}}),e,this)}))),function(e){return S.apply(this,arguments)})},{key:"uploadFromJson",value:(_=l(u().mark((function e(t,r){var n,o,a;return u().wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return n="".concat(this.baseUrl,"/upload_from_json"),o={embeddings_model:this.embeddingsModel,vault:t,json:r},e.next=4,this.makeAuthenticatedRequest(n,{method:"POST",body:JSON.stringify(o)});case 4:return a=e.sent,e.abrupt("return",a.json());case 6:case"end":return e.stop()}}),e,this)}))),function(e,t){return _.apply(this,arguments)})},{key:"editItem",value:(O=l(u().mark((function e(t,r,n){var o,a,s;return u().wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return o="".concat(this.baseUrl,"/edit_item"),a={embeddings_model:this.embeddingsModel,vault:t,item_id:r,text:n},e.next=4,this.makeAuthenticatedRequest(o,{method:"POST",body:JSON.stringify(a)});case 4:return s=e.sent,e.abrupt("return",s.json());case 6:case"end":return e.stop()}}),e,this)}))),function(e,t,r){return O.apply(this,arguments)})},{key:"getTotalItems",value:(w=l(u().mark((function e(t){var r,n,o;return u().wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return r="".concat(this.baseUrl,"/get_total_items"),n={vault:t},e.next=4,this.makeAuthenticatedRequest(r,{method:"POST",body:JSON.stringify(n)});case 4:return o=e.sent,e.abrupt("return",o.json());case 6:case"end":return e.stop()}}),e,this)}))),function(e){return w.apply(this,arguments)})},{key:"deleteVault",value:(x=l(u().mark((function e(t){var r,n,o;return u().wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return r="".concat(this.baseUrl,"/delete_vault"),n={vault:t},e.next=4,this.makeAuthenticatedRequest(r,{method:"POST",body:JSON.stringify(n)});case 4:return o=e.sent,e.abrupt("return",o.json());case 6:case"end":return e.stop()}}),e,this)}))),function(e){return x.apply(this,arguments)})},{key:"deleteItems",value:(k=l(u().mark((function e(t,r){var n,o,a;return u().wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return n="".concat(this.baseUrl,"/delete_items"),o={vault:t,item_ids:r},e.next=4,this.makeAuthenticatedRequest(n,{method:"POST",body:JSON.stringify(o)});case 4:return a=e.sent,e.abrupt("return",a.json());case 6:case"end":return e.stop()}}),e,this)}))),function(e,t){return k.apply(this,arguments)})},{key:"addCloud",value:(g=l(u().mark((function e(t){var r,n,o;return u().wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return r="".concat(this.baseUrl,"/add_cloud"),n=s({vault:"",embeddings_model:this.embeddingsModel,text:"",meta:null,name:null,split:!1,split_size:1e3,gen_sum:!1},t),e.next=4,this.makeAuthenticatedRequest(r,{method:"POST",body:JSON.stringify(n)});case 4:return o=e.sent,e.abrupt("return",o.json());case 6:case"end":return e.stop()}}),e,this)}))),function(e){return g.apply(this,arguments)})},{key:"addSite",value:(b=l(u().mark((function e(t){var r,n,o;return u().wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return r="".concat(this.baseUrl,"/add_site"),n=s({vault:"",embeddings_model:this.embeddingsModel,site:""},t),e.next=4,this.makeAuthenticatedRequest(r,{method:"POST",body:JSON.stringify(n)});case 4:return o=e.sent,e.abrupt("return",o.json());case 6:case"end":return e.stop()}}),e,this)}))),function(e){return b.apply(this,arguments)})},{key:"getVaults",value:(v=l(u().mark((function e(){var t,r,n,o,a=arguments;return u().wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return t=a.length>0&&void 0!==a[0]?a[0]:null,r="".concat(this.baseUrl,"/get_vaults"),n={search_vault:t},e.next=5,this.makeAuthenticatedRequest(r,{method:"POST",body:JSON.stringify(n)});case 5:return o=e.sent,e.abrupt("return",o.json());case 7:case"end":return e.stop()}}),e,this)}))),function(){return v.apply(this,arguments)})},{key:"getAccountData",value:(m=l(u().mark((function e(){var t,r,n;return u().wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return t="".concat(this.baseUrl,"/get_vault_data"),e.next=3,this.makeAuthenticatedRequest(t,{method:"POST",body:JSON.stringify({})});case 3:return r=e.sent,e.next=6,r.json();case 6:return n=e.sent,e.abrupt("return",n.vault_data);case 8:case"end":return e.stop()}}),e,this)}))),function(){return m.apply(this,arguments)})},{key:"getDistance",value:(y=l(u().mark((function e(t,r,n){var o,a,s;return u().wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return o="".concat(this.baseUrl,"/get_distance"),a={vault:t,id1:r,id2:n},e.next=4,this.makeAuthenticatedRequest(o,{method:"POST",body:JSON.stringify(a)});case 4:return s=e.sent,e.abrupt("return",s.json());case 6:case"end":return e.stop()}}),e,this)}))),function(e,t,r){return y.apply(this,arguments)})},{key:"getSimilar",value:(d=l(u().mark((function e(t){var r,n,o;return u().wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return r="".concat(this.baseUrl,"/get_similar"),n=s({embeddings_model:this.embeddingsModel,vault:"",text:"",num_items:4,include_distances:!1},t),e.next=4,this.makeAuthenticatedRequest(r,{method:"POST",body:JSON.stringify(n)});case 4:return o=e.sent,e.abrupt("return",o.json());case 6:case"end":return e.stop()}}),e,this)}))),function(e){return d.apply(this,arguments)})},{key:"savePersonalityMessage",value:(p=l(u().mark((function e(t,r){var n,o,a;return u().wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return n="".concat(this.baseUrl,"/save_personality_message"),o={vault:t,personality_message:r},e.next=4,this.makeAuthenticatedRequest(n,{method:"POST",body:JSON.stringify(o)});case 4:return a=e.sent,e.abrupt("return",a.json());case 6:case"end":return e.stop()}}),e,this)}))),function(e,t){return p.apply(this,arguments)})},{key:"saveCustomPrompt",value:(f=l(u().mark((function e(t,r){var n,o,a;return u().wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return n="".concat(this.baseUrl,"/save_custom_prompt"),o={vault:t,prompt:r},e.next=4,this.makeAuthenticatedRequest(n,{method:"POST",body:JSON.stringify(o)});case 4:return a=e.sent,e.abrupt("return",a.json());case 6:case"end":return e.stop()}}),e,this)}))),function(e,t){return f.apply(this,arguments)})},{key:"fetchPersonalityMessage",value:(c=l(u().mark((function e(t){var r,n,o;return u().wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return r="".concat(this.baseUrl,"/fetch_personality_message"),n={vault:t},e.next=4,this.makeAuthenticatedRequest(r,{method:"POST",body:JSON.stringify(n)});case 4:return o=e.sent,e.abrupt("return",o.json());case 6:case"end":return e.stop()}}),e,this)}))),function(e){return c.apply(this,arguments)})},{key:"fetchCustomPrompt",value:(i=l(u().mark((function e(t){var r,n,o;return u().wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return r="".concat(this.baseUrl,"/fetch_custom_prompt"),n={vault:t},e.next=4,this.makeAuthenticatedRequest(r,{method:"POST",body:JSON.stringify(n)});case 4:return o=e.sent,e.abrupt("return",o.json());case 6:case"end":return e.stop()}}),e,this)}))),function(e){return i.apply(this,arguments)})},{key:"fetch3DMap",value:(a=l(u().mark((function e(t){var r,n,o,a,s=arguments;return u().wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return r=s.length>1&&void 0!==s[1]?s[1]:null,n="".concat(this.baseUrl,"/get_map"),o={vault:t,highlight_id:r},e.next=5,this.makeAuthenticatedRequest(n,{method:"POST",body:JSON.stringify(o)});case 5:return a=e.sent,e.abrupt("return",a.json());case 7:case"end":return e.stop()}}),e,this)}))),function(e){return a.apply(this,arguments)})},{key:"getItems",value:(o=l(u().mark((function e(t,r){var n,o,a;return u().wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return n="".concat(this.baseUrl,"/get_items"),o={vault:t,item_ids:r},e.next=4,this.makeAuthenticatedRequest(n,{method:"POST",body:JSON.stringify(o)});case 4:return a=e.sent,e.abrupt("return",a.json());case 6:case"end":return e.stop()}}),e,this)}))),function(e,t){return o.apply(this,arguments)})},{key:"runFlowStream",value:(r=l(u().mark((function e(t,r){var o,a,s,i,c,l,h,f,p,d,y,m,v,b,g,k,x,w,O,_=arguments;return u().wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return O=function(e,t,r){try{var n=JSON.parse(t);"log"===e?(p.push(n),r.onLog&&r.onLog(n)):"message"===e&&(f+=n,r.onMessage&&r.onMessage(n))}catch(n){console.error("Error parsing data:",n),"log"===e?(p.push(t),r.onLog&&r.onLog(t)):"message"===e&&(f+=t,r.onMessage&&r.onMessage(t))}},o=_.length>2&&void 0!==_[2]?_[2]:"",a=_.length>3&&void 0!==_[3]?_[3]:{},s="".concat(this.baseUrl,"/flow-stream"),i={email:this.email,flow_id:t,message:r,history:o},e.next=7,this.makeAuthenticatedRequest(s,{method:"POST",body:JSON.stringify(i)});case 7:c=e.sent,l=c.body.getReader(),h=new TextDecoder,f="",p=[],d=null,y="";case 14:return e.next=17,l.read();case 17:if(m=e.sent,v=m.value,!m.done){e.next=22;break}return e.abrupt("break",28);case 22:b=h.decode(v),g=b.split("\n"),k=n(g);try{for(k.s();!(x=k.n()).done;)(w=x.value).startsWith("event: ")?(y&&O(d,y,a),d=w.slice(7).trim(),y=""):w.startsWith("data: ")&&(y+=w.slice(6))}catch(e){k.e(e)}finally{k.f()}e.next=14;break;case 28:return y&&O(d,y,a),e.abrupt("return",{response:f,logs:p});case 30:case"end":return e.stop()}}),e,this)}))),function(e,t){return r.apply(this,arguments)})},{key:"logout",value:function(){this.accessToken=null,this.refreshToken=null,this.tokenExpiresAt=null}}],t&&h(e.prototype,t),Object.defineProperty(e,"prototype",{writable:!1}),e;var e,t,r,o,a,i,c,f,p,d,y,m,v,b,g,k,x,w,O,_,S,j,T,P,A,E,N}();return t})()));