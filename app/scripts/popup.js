'use strict';
var $ = window.jQuery;

$(function() {

  function showOption(showEnableLinks, option) {
    if ( showEnableLinks ) {
      $('#enable-'+option).show();
      $('#disable-'+option).hide();
    } else {
      $('#disable-'+option).show();
      $('#enable-'+option).hide();
    }
  }

  function showDomainOptions(tabInfo){
    showOption( tabInfo.domainIsDisabled, 'domain' );
  }

  function showPageOptions(tabInfo){
    showOption( tabInfo.pageIsDisabled, 'page' );
  }

  function showClickshameOptions(tabInfo){
    showOption( tabInfo.clickshameIsDisabled, 'clickshame' );
  }

  function showOptions(tabInfo){
    showDomainOptions(tabInfo);
    showPageOptions(tabInfo);
    showClickshameOptions(tabInfo);
  }

  function bindOption(option, disableMethod, enableMethod) {
    var bg = chrome.extension.getBackgroundPage();

    $('#disable-'+option).click(function(){
      bg[disableMethod]();
      showOption( true, option );
    });

    $('#enable-'+option).click(function(){
      bg[enableMethod]();
      showOption( false, option );
    });
  }

  function bindDomainOptions(){
    bindOption('domain', 'disableDomain', 'enableDomain');
  }

  function bindPageOptions(){
    bindOption('page', 'disablePage', 'enablePage');
  }

  function bindClickshameOptions(){
    bindOption('clickshame', 'disableClickshame', 'enableClickshame');
  }

  function bindOptions() {
    bindDomainOptions();
    bindPageOptions();
    bindClickshameOptions();
  }

  function strikeLoading() {
    $('#strike-spinner').show();
    $('#strike-fields').hide();
  }

  function strikeComplete() {
    $('#strike-fields').html('Clickshame Submitted!');
    $('#strike-spinner').hide();
    $('#strike-fields').show();
  }

  function sendStrike(tabInfo) {
    var strikeData = {
      key: tabInfo.identityKey,
      type: $('input[name="strike-type"]:checked').val(),
      comment: $('#strike-comment').val(),
      url: tabInfo.tab.url
    };

    strikeLoading();
    var bg = chrome.extension.getBackgroundPage();
    bg.sendRequest('POST', '/strikes', strikeData).then(function(results) {
      strikeComplete();
      return results;
    });
  }

  var bg = chrome.extension.getBackgroundPage();
  bg.getTabInfo().then(function(tabInfo) {
    showOptions(tabInfo);
    bindOptions();

    $('#strike-submit').click(function(){ sendStrike(tabInfo); });
  });

});