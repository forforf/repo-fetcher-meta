'use strict';



describe('RepoFetcherMeta', function(){

  beforeEach( function(){


    //initialize module under test
    module('RepoFetcherMeta');
  });


  it('dependency sanity check', function(){
    expect(true).toBe(true);
    expect(_).toBeDefined();
    expect(jsyaml).toBeDefined();
  });

  describe('RepoMeta', function(){
    var repo;
    var _httpBackend;
    var $window;

    beforeEach(inject(function( $injector, $httpBackend, RepoMeta){
      repo = RepoMeta;
      _httpBackend = $httpBackend;
      if(window){
        $window = window;
      } else {
        $window = {};
        $window.atob = function(b64str){
          return new Buffer(b64str||'', 'base64').toString('ascii');
        };
        $window.btoa = function(asciiStr){
          return new Buffer(asciiStr||'', 'ascii').toString('base64');
        };
      }


    }));

    it('sanity check', function(){
      expect(repo).toBeDefined();
    });

    describe('.insertRepoMeta', function(){
      var fetchedMetas;
      var repos;
      var metaYaml;
      var metaYamlB64;
      var contentResponse;

      beforeEach(function(){
        fetchedMetas = [];
        repos = null;

        repos = [
          {
            name: 'repoA',
            contents_url: "https://api.github.com/repos/userA/repoA/contents/{+path}"
          },
          {
            name: 'repoB',
            contents_url: "https://api.github.com/repos/userA/repoB/contents/{+path}"
          },
          {
            name: 'repoC',
            contents_url: "https://api.github.com/repos/userA/repoC/contents/{+path}"
          }
        ];

        metaYaml = function(repoId){
          return [
            '---',
            'tags:',
            '- tag1',
            '- tag2',
            '- repo-'+repoId,
            'ratings:',
            '  stable: 4',
            '  useful: 8',
            '  caliber: 7',
            '  tidy: 7',
            '  tended: 9',
            '  tests: 1',
            '  unique: 4',
            '  abandoned: false',
            'graph:',
            '- nodeA:',
            '  - nodeAa: null',
            '  - nodeAb: nodeB',
            '- nodeB:',
            '  - nodeBa: nodeA',
            '  - nodeBb: null'
          ].join("\n");
        };


        metaYamlB64 = function(repoId){
          return $window.btoa(metaYaml(repoId));
        };

        contentResponse = function(repoId){
          return {
            "name": ".repo-meta.yml",
            "path": ".repo-meta.yml",
            "sha": "some-sha",
            "size": 150,
            "url": "https://api.github.com/repos/userA/repo"+repoId+"/contents/.repo-meta.yml?ref=master",
            "html_url": "https://github.com/userA/repo"+repoId+"/blob/master/.repo-meta.yml",
            "git_url": "https://api.github.com/repos/userA/repo"+repoId+"/git/blobs/20fd22fa2ab7c0fbcad2f196175dad852149e304",
            "type": "file",
            "content": metaYamlB64(repoId),
            "encoding": "base64",
            "_links": {
              "self": "https://api.github.com/repos/userA/repo"+repoId+"/contents/.repo-meta.yml?ref=master",
              "git": "https://api.github.com/repos/userA/repo"+repoId+"/git/blobs/20fd22fa2ab7c0fbcad2f196175dad852149e304",
              "html": "https://github.com/userA/repo"+repoId+"/blob/master/.repo-meta.yml"
            }
          }
        };

      });

      describe('nominal cases', function(){

        beforeEach(function(){
          _httpBackend
            .when('GET', /\.repo-meta\.yml/)
            .respond(
            function(method, url, data){
              if (url.match(/repoA/)){
                return [200, contentResponse('A'), {}]
              }
              if (url.match(/repoB/)){
                return [200, contentResponse('B'), {}]
              }
              if (url.match(/repoC/)){
                return [200, contentResponse('C'), {}]
              }
              return [999, 'test error', {}]
            }
          );

          repo.insertRepoMeta(repos)
            .then(function(metas){
              fetchedMetas = metas;
            })
            .catch(function(err){
              respErrs.push(err);
            });
        });


        it('returns collection', function(){
          fetchedMetas = null;
          _httpBackend.flush();
          expect(fetchedMetas.length).toEqual(3);
        });

        it('each item matches returned data', function(){
          fetchedMetas = null;
          _httpBackend.flush();
          fetchedMetas.forEach(function(repo){
            var repoName = repo && repo.name;
            var repoId = repoName.slice(-1);
            expect(repo._ff_meta_).toEqual(jsyaml.safeLoad(metaYaml(repoId)));
          });
        });
      });

      describe('abnormal cases', function(){
        describe('missing file', function(){
          var respErrs;
          var errorMeta;

          beforeEach(function(){
            respErrs = [];
            errorMeta = null;

            _httpBackend
              .when('GET', /\.repo-meta\.yml/)
              .respond(
                function(method, url, data){
                  if (url.match(/repoA/)){
                     return [200, contentResponse('A'), {}]
                  }
                  if (url.match(/repoB/)){
                    return [404, 'missing', {}]
                  }
                  if (url.match(/repoC/)){
                    return [200, contentResponse('C'), {}]
                  }
                  return [999, 'test error', {}]
                }
              );

            repo.insertRepoMeta(repos)
              .then(function(metas){
                fetchedMetas = metas;
              })
              .catch(function(err){
                respErrs.push(err);
              });
          });

          it('returns all repo metadata with no errors', function(){
            expect(fetchedMetas.length).toEqual(0);
            expect(respErrs.length).toEqual(0);

            _httpBackend.flush();

            expect(fetchedMetas.length).toEqual(3);
            expect(respErrs.length).toEqual(0);
          });

          it('returns metadata with error object for missing data', function(){
            expect(fetchedMetas.length).toEqual(0);
            _httpBackend.flush();
            expect(fetchedMetas.length).toEqual(3);
            errorMeta = fetchedMetas.filter(function(meta){
              return meta
                && meta._ff_meta_
                && meta._ff_meta_.error
                && meta._ff_meta_.error.status
                && meta._ff_meta_.error.status === 404;
            });

            expect(errorMeta.length).toEqual(1);
          });
        });


        describe('unexpected content', function(){
          var respErrs;
          var errorMeta;

          beforeEach(function(){
            respErrs = [];
            errorMeta = null;

            _httpBackend
              .when('GET', /\.repo-meta\.yml/)
              .respond(
              function(method, url, data){
                if (url.match(/repoA/)){
                  return [200, contentResponse('A'), {}]
                }
                if (url.match(/repoB/)){
                  return [200, '---{ malformed: {   version: 1.0 }', {}]
                }
                // Not testing, breaks angular
                //Can use a workaround using angular's transformResponse
                //But not worth it for the unlikeliness of this occurring
                // if (url.match(/repoC/)){
                //   return [200, '{ malformed: {   version: 2.0 }', {}]
                // }
                if (url.match(/repoC/)){
                  return [200, contentResponse('C'), {}]
                }
                return [999, 'test error', {}]
              }
            );

            repo.insertRepoMeta(repos)
              .then(function(metas){
                fetchedMetas = metas;
              })
              .catch(function(err){
                respErrs.push(err);
              });
          });


          it('returns all repo metadata with no errors', function(){
            expect(fetchedMetas.length).toEqual(0);
            expect(respErrs.length).toEqual(0);

            _httpBackend.flush();

            expect(fetchedMetas.length).toEqual(3);
            expect(respErrs.length).toEqual(0);
          });

          it('returns metadata with error object for unparsed data', function(){
            expect(fetchedMetas.length).toEqual(0);
            _httpBackend.flush();
            expect(fetchedMetas.length).toEqual(3);
            errorMeta = fetchedMetas.filter(function(meta){
              return meta
                && meta._ff_meta_
                && meta._ff_meta_.error
            });

            expect(errorMeta.length).toEqual(1);
          });
        });

        xdescribe('placeholder if there are any mandatory fields - currently completely freeform', function(){
        });
      });
    });


  });

})