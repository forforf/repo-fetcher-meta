'use strict';

// Depends on js-yaml and underscore
// ToDo: Lazy load those dependencies into this component
// rather than hope the appropriate html script tag is used by app


angular.module('RepoFetcherMeta', ['GithubRepoFetcher', 'AngularEtag'])



  .factory('RepoMeta', function ($q, ehttp, GithubRepo, qChain) {
    //we expect responses to be strings not json
    //so we remove the default handler that will automatically
    //try to convert to json
    ehttp.defaults.transformResponse = function(data){return data};


    //ToDo: Consider making as a config
    var REPO_META_FILENAME = '.repo-meta.yml';
    var REPO_META_KEYNAME  = '_ff_meta_';


    // a bit hacky as we're assuming raw.github.com will always work
    function buildRawUrl(fullRepoName, branch, file){
      return 'https://raw.github/com/'
        + fullRepoName + '/'
        + branch + '/'
        + file
    }

    function getRawUrl(repoObj){
      var fullName = repoObj.full_name;
      var branch = repoObj.default_branch;
      return buildRawUrl(fullName, branch, REPO_META_FILENAME);
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

    function getHttpData(url){
      return ehttp.etagGet({url: url})
        .then( function(resp){
          return(resp.data);
        })

        // We don't want to quit fetching other repos
        // if one errors out. Instead return YAML with the error
        .catch(function(err){

          //we need to clean the error object up
          //so it's safe and parseable by Yaml
          //add optional yaml separator too ('---')
          var errObj = {error: err};
          var errYaml = '---\n' + jsyaml.safeDump(errObj, {skipInvalid: true});
          return(errYaml);
        });
    }

    function insertRepoMeta(repos){
      var metaUrls = repos.map(function(repo){ return getRawUrl(repo) });
      //ToDo: add throttle mechanism

      return $q.all( metaUrls.map( getHttpData ) )
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
