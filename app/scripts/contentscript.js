
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
      return href.replace(/^[A-Za-z]{1,15}:\/\/[w]{0,3}\.?/, '').replace(/[#?](.*)$/,'').replace(/\/$/, '');
    } else {
      return (document.domain+href).replace(/^[A-Za-z]{1,15}:\/\/[w]{0,3}\.?/, '').replace(/[#?](.*)$/,'').replace(/\/$/, '');
    }
  }

  function getUrlHashesFromLinks(links) {
    var CryptoJS = window.CryptoJS;
    return new PromiseA(function(resolve){
      var hashes = [];
      for(var i=0; i<links.length; i++) {
        if ( links[i].href === '' ) { continue; }
        hashes.push( CryptoJS.MD5(fullUrlFromHref(links[i].href)).toString() );
      }
      resolve( hashes.getUnique() );
    });
  }

  function getCurrentReferences() {
    return new PromiseA(function(resolve){
      var links = document.getElementsByTagName('a');
      getUrlHashesFromLinks(links).then(function(hashes){
        resolve( hashes );
      });
    });
  }

  // function clickshameLoadingHtml() {
  //   return '<div class="clickshame-spinner" id="strike-spinner">'+
  //     '<div class="clickshame-double-bounce1"></div>'+
  //     '<div class="clickshame-double-bounce2"></div>'+
  //     '</div>';
  // }

  function clickshameTooltip(scores, comments) {
    var html = '';
    html += '<div class="clickshame-scores">';
    for ( var i=0; i<scores.length; i++ ) {
      html += '<div class="clickshame-score '+scores[i].type+'">'+scores[i].type+': '+scores[i].value+'</div>';
    }
    html += '</div>';
    if ( comments.length > 0 ) {
      html += '<div class="clickshame-comments">';
      for ( var j=0; j<comments.length; j++ ) {
        html += '<div class="clickshame-comment">'+comments[j].text+'</div>';
      }
    }
    return html;
  }

  function bindTooltip(elm) {
    return new PromiseA(function(){

      var pageX = Math.floor( $(elm).offset().top );
      var pageY = Math.floor( $(elm).offset().left );

      $(elm).hover(function(){ // Hover event

        $('<div class="clickshame-tooltip"></div>')
        .html('<div class="clickshame-spinner"'+
        '<div class="clickshame-double-bounce1"></div>'+
        '<div class="clickshame-double-bounce2"></div>'+
        '</div>')
        .appendTo('body')
        .css('top', (pageX - 50) + 'px')
        .css('left', (pageY) + 'px')
        .fadeIn('slow');

        chrome.runtime.sendMessage({func: 'getTabInfo'}, function(tabInfo) {
          var message = {
            func: 'sendRequest',
            method: 'GET',
            path: '/references/find',
            data: {key: tabInfo.identityKey, url: elm.href.replace(/^[A-Za-z]{1,15}:\/\/[w]{0,3}\.?/, '').replace(/[#?](.*)$/,'').replace(/\/$/, '')}
          };

          chrome.runtime.sendMessage(message, function(response) {
            var scores = response.Scores;
            var comments = response.Comments;

            $('.clickshame-tooltip')
            .html(clickshameTooltip(scores, comments))
            .css('top', (pageX - 100) + 'px');
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
      getCurrentReferences().then(function(hashes){
        var message = {
          func: 'sendRequest',
          method: 'POST',
          path: '/references/find',
          data: {key: tabInfo.identityKey, hashes: hashes}
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