'use strict';

(function(exports){
  var PromiseA = window.Promise;

  function baseUrl() {
    return PromiseA.resolve('http://api.clickshame.com');
    // return PromiseA.resolve('http://localhost:3000');
  }

  function payloadToQueryString(data) {
    return new PromiseA(function(resolve){
      var parts = [];

      for (var i in data) {
        if (data.hasOwnProperty(i)) {
          if ( Array.isArray(data[i]) ) {
            for ( var j=0; j<data[i].length; j++ ){
              // parts.push(encodeURIComponent(i) + '['+j+']=' + encodeURIComponent(data[i][j]));
              parts.push(encodeURIComponent(i) + '=' + encodeURIComponent(data[i][j]));
            }
          } else {
            parts.push(encodeURIComponent(i) + '=' + encodeURIComponent(data[i]));
          }
        }
      }
      resolve( parts.join('&') );
    });
  }

  function sendRequest(method, path, data) {
    return baseUrl().then(function(url){
      return payloadToQueryString(data).then(function(dataString){
        return new PromiseA(function(resolve, reject){
          var requestUrl = url+path;
          if ( method === 'GET' ) { requestUrl += '?'+dataString; }
          var request = new XMLHttpRequest();
          request.open(method, requestUrl, true);
          request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
          request.setRequestHeader('Access-Control-Allow-Origin', url);
          request.onreadystatechange = function(){
            if (request.readyState === 4 && request.status === 200) {
              if (request.responseText) {
                resolve(JSON.parse(request.responseText));
              } else {
                reject(new Error('Response text not found.'));
              }
            }
          };
          // request.send(data);
          request.send(dataString);
        });
      });
    });
  }

  function createIdentity() {
    var data = { source: 'chrome' };
    return sendRequest('POST', '/identities', data).then(function(results) {
      return results;
    });
  }

  function getIdentityKey() {
    if ( localStorage.identityKey ) {
      return PromiseA.resolve( localStorage.identityKey );
    }

    return createIdentity().then(function(identity) {
      var key = identity.key;
      localStorage.identityKey = key;
      return key;
    });
  }

  function getTab() {
    // return new PromiseA(function(resolve, reject){
    return new PromiseA(function(resolve){
      return chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs.length === 0) { return; } // For example: only the background devtools or a popup are opened

        var tab = tabs[0];
        resolve(tab);

        // if (tab && !tab.url) {
        //   // Issue 6877: tab URL is not set directly after you opened a window
        //   // using window.open()
        //   if (!tryAgain)
        //     window.setTimeout(function() {
        //       getTab(callback, true);
        //     }, 250);
        //   return tab;
        // }

      });
    });
  }

  function getTabInfo() {
    return PromiseA.all([
      getTab(),
      getIdentityKey(),
      domainIsDisabled(),
      pageIsDisabled(),
      clickshameIsDisabled()
    ]).then(function(results){
      return {
        tab: results[0],
        identityKey: results[1],
        domainIsDisabled: results[2],
        pageIsDisabled: results[3],
        clickshameIsDisabled: results[4],
      };
    });
  }

  function getUrlFromTab() {
    return getTab().then(function(tab){
      return tab.url.replace(/^[A-Za-z]{1,15}:\/\/[w]{0,3}\.?/, '').replace(/[#?](.*)$/,'').replace(/\/$/, '');
    });
  }

  function getDomainFromTab() {
    return getTab().then(function(tab){
      var domainElm = document.createElement ('a');
      domainElm.href = tab.url;
      var domain = domainElm.hostname;

      return domain;
    });
  }

  function domainIsDisabled() {
    return getDomainFromTab().then(function(domain){
      if ( !localStorage.disabledDomains ) { return false; }
      if ( localStorage.disabledDomains.indexOf(domain) > -1 ) { return true; }
      return false;
    });
  }

  function disableDomain() {
    return getDomainFromTab().then(function(domain){
      var disabledDomains = [];
      if ( localStorage.disabledDomains ) { disabledDomains = JSON.parse(localStorage.disabledDomains); }
      disabledDomains.push(domain);
      localStorage.disabledDomains = JSON.stringify(disabledDomains);
    });
  }

  function enableDomain() {
    return getDomainFromTab().then(function(domain){
      if ( !localStorage.disabledDomains ) { return; }
      var disabledDomains = JSON.parse(localStorage.disabledDomains);
      var index = disabledDomains.indexOf(domain);
      if (index !== -1) {
        disabledDomains.splice(index, 1);
      }
      localStorage.disabledDomains = JSON.stringify(disabledDomains);
    });
  }

  function pageIsDisabled() {
    return getUrlFromTab().then(function(url){
      if ( !localStorage.disabledPages ) { return false; }
      if ( localStorage.disabledPages.indexOf(url) > -1 ) { return true; }
      return false;
    });
  }

  function disablePage() {
    return getUrlFromTab().then(function(url){
      var disabledPages = [];
      if ( localStorage.disabledPages ) { disabledPages = JSON.parse(localStorage.disabledPages); }
      disabledPages.push(url);
      localStorage.disabledPages = JSON.stringify(disabledPages);
    });
  }

  function enablePage() {
    return getUrlFromTab().then(function(url){
      if ( !localStorage.disabledPages ) { return; }
      var disabledPages = JSON.parse(localStorage.disabledPages);
      var index = disabledPages.indexOf(url);
      if (index !== -1) {
        disabledPages.splice(index, 1);
      }
      localStorage.disabledPages = JSON.stringify(disabledPages);
    });
  }

  function clickshameIsDisabled() {
    return new PromiseA(function(resolve){
      if ( !localStorage.clickshameDisabled ) { resolve(false); }
      resolve( ( localStorage.clickshameDisabled === 'true' ? true : false ) );
    });
  }

  function disableClickshame() {
    return new PromiseA(function(){
      localStorage.clickshameDisabled = true;
    });
  }

  function enableClickshame() {
    return new PromiseA(function(){
      localStorage.clickshameDisabled = false;
    });
  }

  exports.domainIsDisabled = domainIsDisabled;
  exports.disableDomain = disableDomain;
  exports.enableDomain = enableDomain;

  exports.pageIsDisabled = pageIsDisabled;
  exports.disablePage = disablePage;
  exports.enablePage = enablePage;

  exports.clickshameIsDisabled = clickshameIsDisabled;
  exports.disableClickshame = disableClickshame;
  exports.enableClickshame = enableClickshame;

  exports.getTabInfo = getTabInfo;
  // exports.cleanUrl = cleanUrl;
  exports.sendRequest = sendRequest;

  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    // sendResponse({farewell: 'goodbye'});
    if ( request.func === 'getTabInfo' ) {
      getTabInfo().then(function(tabInfo){
        sendResponse(tabInfo);
      });
    } else if ( request.func === 'sendRequest' ) {
      sendRequest(request.method, request.path, request.data).then(function(res){
        sendResponse(res);
      });
    }
    return true;
  });

}(window));


