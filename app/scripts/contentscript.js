
window.onload = function(){
  'use strict';
  var PromiseA = window.Promise;

  Array.prototype.getUnique = function(){
    var u = {}, a = [];
    for(var i = 0, l = this.length; i < l; ++i){
      if(u.hasOwnProperty(this[i])) {
        continue;
      }
      a.push(this[i]);
      u[this[i]] = 1;
    }
    return a;
  };

  function fullUrlFromHref( href ) {
    if ( href.indexOf( '://' ) > -1 ) {
      return href;
    } else {
      return document.domain+href;
    }
  }

  function getUrlsFromLinks(links) {
    return new PromiseA(function(resolve){
      var urls = [];
      for(var i=0; i<links.length; i++) {
        if ( links[i].href === '' ) { continue; }
        urls.push( fullUrlFromHref(links[i].href) );
      }
      resolve( urls.getUnique() );
    });
  }

  function getCurrentReferences() {
    return new PromiseA(function(resolve){
      var links = document.getElementsByTagName('a');
      getUrlsFromLinks(links).then(function(urls){
        resolve( urls );
      });
    });
  }

  function paintLink(elm) {
    elm.className = elm.className + ' clickshame';
  }

  function paintLinks(referenceArray) {
    var referenceUrlArray = referenceArray.map(function(ref){ return ref.url; });
    var links = document.getElementsByTagName('a');
    var linkUrl;
    for ( var i=0; i<links.length; i++ ) {
      linkUrl = links[i].href.replace(/^[A-Za-z]{1,15}:\/\/[w]{0,3}\.?/, '').replace(/[#?](.*)$/,'').replace(/\/$/, '');
      if ( referenceUrlArray.indexOf(linkUrl) > -1 ) {
        paintLink(links[i]);
      }
    }
  }

  function submitCurrentReferences(tabInfo) {
    return new PromiseA(function(){
      getCurrentReferences().then(function(urls){
        var message = {
          func: 'sendRequest',
          method: 'GET',
          path: '/references',
          data: {key: tabInfo.identityKey, urls: urls}
        };

        chrome.runtime.sendMessage(message, function(response) {
          paintLinks(response);
        });
      });
    });
  }

  function isDisabled(tabInfo) {
    return new PromiseA(function(resolve){
      resolve( !!(tabInfo.domainIsDisabled || tabInfo.pageIsDisabled || tabInfo.clickshameIsDisabled) );
    });
  }

  chrome.runtime.sendMessage({func: 'getTabInfo'}, function(tabInfo) {
    isDisabled(tabInfo).then(function(val){
      if ( !val ) {
        submitCurrentReferences(tabInfo);
      }
    });
  });


};