'use strict';

// Depends on js-yaml and underscore
// ToDo: Lazy load those dependencies into this component
// rather than hope the appropriate html script tag is used by app


angular.module('RepoFetcherMeta', ['GithubRepoFetcher', 'AngularEtag'])



  .factory('RepoMeta', function ($q, ehttp, GithubRepo, qChain, $window) {

    //ToDo: Consider making as a config
    var REPO_META_FILENAME = '.repo-meta.yml';
    var REPO_META_KEYNAME  = '_ff_meta_';

    function isRequestProblem(repoObj){
      if (!repoObj){ return {error: 'No repository information provided'}}
      if (!repoObj.contents_url){ return {error: 'Repository information did not have contents_url property'}}
      return false;
    }

    function getContentUrl(repoObj){

      var isProb = isRequestProblem(repoObj);

      //returns if there is a problem
      if (isProb){ return isProb }

      var urlTemplate = repoObj.contents_url;
      var path = REPO_META_FILENAME;
      var contentUrl = urlTemplate.replace(/{\+path}/, path);

      return  contentUrl;
    }

    function convertYmlCollection(ymlStrs){
      return ymlStrs.map( function(ymlStr){
        try {
          return jsyaml.safeLoad(ymlStr);
        } catch(e) {
          if(e.name === 'YAMLException'){
            return {error: e};
          } else {
          throw e;
          }
        }
      });
    }

    function isResponseProblem(respData){
      if(!respData || !respData.type ){
        return { error: 'Could not parse response'};
      }
      if(respData.type !== "file"){
        return { error: REPO_META_FILENAME + ' was not a file, it was' + respData.type.toString()};
      }

      if (respData.encoding && respData.encoding !== 'base64'){
        return { error: 'Unknown encoding for ' + REPO_META_FILENAME + ': ' + respData.encoding.toString() };
      }

      if (!respData.content){

        return { error: 'Could not find encoded content in ' + REPO_META_FILENAME };
      }

      return false

    }

    function makeYamlFromObj(jsObj){
      return '---\n' + jsyaml.safeDump(jsObj, {skipInvalid: true});
    }

    function getHttpDataAsString(url){

      if(typeof url !== 'string'){
        if(url.error){ return makeYamlFromObj(url); }
        var errObj = {error: 'Unknown URL type: ' + url.toString() };
        return makeYamlFromObj(errObj);
      }

      var getOpts = {
        url: url
        //transformResponse: function(data){return data}
      }

      //ToDo: have consistent error handling. Catch the error in the promise or no?
      return ehttp.etagGet(getOpts)
        .then( function(resp){
          var respData = resp.data;
          var isProblem = isResponseProblem(respData);
          if (isProblem){ return makeYamlFromObj(isProblem); }
          var trimmedContent = respData.content.replace(/(\r\n|\n|\r)/gm,"");
          var respYaml;
          console.log('respData content', respData.content);
          try {
            respYaml = $window.atob(respData.content);
          } catch(e) {
            respYaml = makeYamlFromObj({
              errorType: 'atobError',
              error: e.toString()
              }
            });
          }

          return(respYaml);
        })

        // We don't want to quit fetching other repos
        // if one errors out. Instead return YAML with the error
        .catch(function(err){

          //we need to clean the error object up
          //so it's safe and parseable by Yaml
          //add optional yaml separator too ('---')
          var errObj = {error: err};
          return makeYamlFromObj(errObj);
        });
    }

    function insertRepoMeta(repos){
      //var contentUrls= repos.map( getContentUrl )
      var metaUrls = repos.map(function(repo){ return getContentUrl(repo) });
      //ToDo: add throttle mechanism

      return $q.all( metaUrls.map( getHttpDataAsString ) )
        .then(function(metaYmlStrs){
          var metaObjs = convertYmlCollection(metaYmlStrs);
          repos.forEach(function(repo, idx){
            repo[REPO_META_KEYNAME] = metaObjs[idx];
          });
          return repos;
      });
    }


    return {
      insertRepoMeta: insertRepoMeta
    };
  });
;
