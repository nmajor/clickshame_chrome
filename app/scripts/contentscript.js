
window.onload = function(){
  'use strict';
  var $ = window.jQuery;
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

  // function clickshameLoadingHtml() {
  //   return '<div class="clickshame-spinner" id="strike-spinner">'+
  //     '<div class="clickshame-double-bounce1"></div>'+
  //     '<div class="clickshame-double-bounce2"></div>'+
  //     '</div>';
  // }

  function bindTooltip(elm) {
    return new PromiseA(function(){

      var pageX = Math.floor( $(elm).offset().top );
      var pageY = Math.floor( $(elm).offset().left );

      console.log('blah1');
      console.log(pageX);
      console.log(pageY);

      $(elm).hover(function(){ // Hover event
        console.log('blah2');
        console.log(pageX);
        console.log(pageY);

        $('<div class="clickshame-tooltip"></div>')
        .html('<div class="clickshame-spinner"'+
        '<div class="clickshame-double-bounce1"></div>'+
        '<div class="clickshame-double-bounce2"></div>'+
        '</div>')
        .appendTo('body')
        .css('top', (pageX - 60) + 'px')
        .css('left', (pageY) + 'px')
        .fadeIn('slow');

        chrome.runtime.sendMessage({func: 'getTabInfo'}, function(tabInfo) {
          var message = {
            func: 'sendRequest',
            method: 'GET',
            path: '/references',
            data: {key: tabInfo.identityKey, url: elm.href.replace(/^[A-Za-z]{1,15}:\/\/[w]{0,3}\.?/, '').replace(/[#?](.*)$/,'').replace(/\/$/, '')}
          };

          chrome.runtime.sendMessage(message, function(response) {
            var tooltipHtml = '';
            var scores = response.Scores;
            console.log('blahman');
            console.log(scores);
            console.log(scores.length);
            for ( var i=0; i<scores.length; i++ ) {
              tooltipHtml += '<div>'+scores[i].type+': '+scores[i].value+'</div>';
            }
            $('.clickshame-tooltip').html(tooltipHtml);
          });
        });

      }, function(){ // Hover off event

        $('.clickshame-tooltip').remove();

      });
    });
  }

  function paintElement(elm) {
    return new PromiseA(function(){
      elm.className = elm.className + ' clickshame';
      bindTooltip(elm);
    });
  }

  function getUrlArrayFromResponse(response) {
    return new PromiseA(function(resolve){
      resolve( response.map(function(ref){ return ref.url; }) );
    });
  }

  function paintElements(referenceUrlArray) {
    return new PromiseA(function(){
      var links = document.getElementsByTagName('a');
      var linkUrl;
      for ( var i=0; i<links.length; i++ ) {
        linkUrl = links[i].href.replace(/^[A-Za-z]{1,15}:\/\/[w]{0,3}\.?/, '').replace(/[#?](.*)$/,'').replace(/\/$/, '');
        if ( referenceUrlArray.indexOf(linkUrl) > -1 ) {
          paintElement(links[i]);
        }
      }
    });
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
          getUrlArrayFromResponse(response).then(function(referenceUrlArray) { paintElements(referenceUrlArray); });
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