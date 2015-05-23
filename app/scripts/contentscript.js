
window.onload = function(){
  'use strict';
  var $ = window.jQuery;
  var PromiseA = window.Promise;
  var urlShorteners = window.urlShorteners;

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

  function getParameterByName(href, name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)'),
        results = regex.exec(href);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
  }

  function skipLink(href) {
    if ( !href ||
      href === '' ||
      href.indexOf( 'www.facebook.com' ) > -1
    ) { return true; } else { return false; }
  }

  function fullUrlFromHref( href ) {
    if ( window.location.hostname === 'www.facebook.com' ) {
      return getParameterByName(href, 'u');
    } else if ( href.indexOf( '://' ) > -1 ) {
      return href;
    } else {
      return document.domain+href;
    }
  }

  function urlFromLinks(links) {
    return new PromiseA(function(resolve){
      var linkUrls = [];
      var url;

      for(var i=0; i<links.length; i++) {
        url = fullUrlFromHref( $(links[i]).prop('href'));
        if ( skipLink( url ) ) { continue; }
        linkUrls.push( url );
      }
      resolve(linkUrls);
    });
  }

  // function resolveUrl(url) {
  //   return new PromiseA(function(resolve){
  //     var domain = $('<a>').prop('href', url).prop('hostname');
  //     if ( $.inArray(domain, urlShorteners) > -1 ) {
  //         console.log('blahblahresolveurl1');
  //         console.log(result);

  //         resolve( result[url] );
  //     } else { resolve(url); }
  //   });
  // }

  function getUrlHashesFromLinks(links) {
    var CryptoJS = window.CryptoJS;
    return new PromiseA(function(resolve){
      var hashes = [];

      urlFromLinks(links).map(resolveUrl)
      .then(function(fullLinkUrls) {
        for(var j=0; j<fullLinkUrls.length; j++) {
          hashes.push( CryptoJS.MD5( fullLinkUrls[j].replace(/^[A-Za-z]{1,15}:\/\/[w]{0,3}\.?/, '').replace(/[#?](.*)$/,'').replace(/\/$/, '') ).toString() );
        }
      })
      .then(function() {
        resolve( hashes.getUnique() );
      });
    });
  }

  function clickshameTooltip(scores, comments) {
    var compositeScore = scores.filter(function(score){ return score.type === 'composite'; })[0];
    var html = '';

    html += '<div class="clickshame-scores">';
    html +=   '<div class="clickshame-score">';
    html +=     '<div class="clickshame-score-header">Clickshame Score</div>';
    html +=     '<div class="clickshame-score-value">'+compositeScore.value+'</div>';
    html +=   '</div>';
    html += '</div>';
    html += '<div class="clickshame-comments">';
    html +=   '<div class="clickshame-comments-header">Recent Comments:</div>';

    if ( comments.length > 0 ) {
      for ( var j=0; j<comments.length; j++ ) {
        html += '<div class="clickshame-comment">'+comments[j].text+'</div>';
      }
    } else {
      html += '<div class="clickshame-comment">No recent comments.</div>';
    }

    html += '</div>';

    return html;
  }

  function bindTooltip(elm) {
    return new PromiseA(function(){

      var pageX = Math.floor( $(elm).offset().top );
      var pageY = Math.floor( $(elm).offset().left );
      var tooltipX;

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
            data: {key: tabInfo.identityKey, url: $(elm).prop('href').replace(/^[A-Za-z]{1,15}:\/\/[w]{0,3}\.?/, '').replace(/[#?](.*)$/,'').replace(/\/$/, '')}
          };

          chrome.runtime.sendMessage(message, function(response) {
            var scores = response.Scores;
            var comments = response.Comments;

            $('.clickshame-tooltip')
            .html(clickshameTooltip(scores, comments));

            tooltipX = $('.clickshame-tooltip').height();
            $('.clickshame-tooltip').css('top', (pageX - tooltipX - 22) + 'px');
          });
        });

      }, function(){ // Hover off event

        $('.clickshame-tooltip').remove();

      });
    });
  }

  function paintElement(elm) {
    return new PromiseA(function(){
      $(elm).addClass( 'clickshame' );
      bindTooltip(elm);
    });
  }

  function getUrlArrayFromResponse(response) {
    return new PromiseA(function(resolve){
      resolve( response.map(function(ref){ return ref.url; }) );
    });
  }

  function paintElements(referenceUrlArray, links) {
    return new PromiseA(function(){
      // var links = document.getElementsByTagName('a');
      var linkUrl;
      for ( var i=0; i<links.length; i++ ) {
        linkUrl = fullUrlFromHref( $( links[i] ).prop('href') ).replace(/^[A-Za-z]{1,15}:\/\/[w]{0,3}\.?/, '').replace(/[#?](.*)$/,'').replace(/\/$/, '');
        if ( referenceUrlArray.indexOf(linkUrl) > -1 ) {
          paintElement(links[i]);
        }
      }
    });
  }

  function submitLinks(tabInfo, links){
    return getUrlHashesFromLinks(links).then(function(hashes){
      if (hashes.length < 1) { return; }
      var message = {
        func: 'sendRequest',
        method: 'POST',
        path: '/references/find',
        data: {key: tabInfo.identityKey, hashes: hashes}
      };

      chrome.runtime.sendMessage(message, function(response) {
        getUrlArrayFromResponse(response).then(function(referenceUrlArray) { paintElements(referenceUrlArray, links); });
      });
    });
  }

  function getCurrentLinks() {
    return new PromiseA(function(resolve){
      resolve( document.getElementsByTagName('a') );
    });
  }

  function submitCurrentLinks(tabInfo) {
    return new PromiseA(function(resolve){
      getCurrentLinks().then(function(links) {
        resolve( submitLinks(tabInfo, links) );
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
        submitCurrentLinks(tabInfo);
      }
    });
  });

  var observer = new MutationObserver(function (mutations) {
    var newLinks = [];
    mutations.forEach(function (mutation, index, array) {
      $(mutation.addedNodes).find('a').each(function() {
        newLinks.push( $(this) );
      });
      if ( (index+1) === array.length && newLinks.length > 0 ) {
        chrome.runtime.sendMessage({func: 'getTabInfo'}, function(tabInfo) {
          isDisabled(tabInfo).then(function(val){
            if ( !val ) {
              submitLinks(tabInfo, newLinks);
            }
          });
        });
      }
    });
  });
  var body = document.querySelector('body');
  var options = {
    subtree: true,
    childList: true,
    attributes: false
  };
  observer.observe(body, options);

};