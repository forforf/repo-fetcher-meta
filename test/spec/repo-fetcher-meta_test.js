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

    beforeEach(inject(function( $injector, $httpBackend, RepoMeta){
      repo = RepoMeta;
      _httpBackend = $httpBackend;


    }));

    it('sanity check', function(){
      expect(repo).toBeDefined();
    });

    describe('.insertRepoMeta', function(){

      describe('nominal cases', function(){
        var fetchedMetas;
        var repos;
        var metaYaml;



        beforeEach(function(){
          repos = [
            {
              full_name: 'userA/repoA',
              default_branch: 'branchA'
            },
            {
              full_name: 'userA/repoB',
              default_branch: 'branchB'
            },
            {
              full_name: 'userA/repoC',
              default_branch: 'branchC'
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

          _httpBackend
            .when('GET', /\.repo-meta\.yml/)
            .respond(
            function(method, url, data){
              if (url.match(/repoA/)){
                return [200, metaYaml('A'), {}]
              }
              if (url.match(/repoB/)){
                return [200, metaYaml('B'), {}]
              }
              if (url.match(/repoC/)){
                return [200, metaYaml('C'), {}]
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

        it('each item has description object', function(){
          fetchedMetas = null;
          _httpBackend.flush();
          fetchedMetas.forEach(function(repo){
            var keys = Object.keys(repo);
            var repoName = repo && repo.full_name;
            var repoId = repoName.slice(-1);
            expect(repo._ff_meta_).toEqual(jsyaml.safeLoad(metaYaml(repoId)));
          });
        });
      });

      describe('abnormal cases', function(){
        describe('missing file', function(){
          var fetchedMetas;
          var repos;
          var respErrs;
          var errorMeta;

          beforeEach(function(){
            fetchedMetas = [];
            respErrs = [];
            repos = null;
            errorMeta = null;


            function metaYaml(repoId){
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
            }


            repos = [
              {
                full_name: 'userA/repoA',
                default_branch: 'branchA'
              },
              {
                full_name: 'userA/repoB',
                default_branch: 'branchB'
              },
              {
                full_name: 'userA/repoC',
                default_branch: 'branchC'
              }
            ];

            _httpBackend
              .when('GET', /\.repo-meta\.yml/)
              .respond(
                function(method, url, data){
                  if (url.match(/repoA/)){
                     return [200, metaYaml('A'), {}]
                  }
                  if (url.match(/repoB/)){
                    return [404, 'missing', {}]
                  }
                  if (url.match(/repoC/)){
                    return [200, metaYaml('C'), {}]
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
          var fetchedMetas;
          var repos;
          var respErrs;
          var errorMeta;

          beforeEach(function(){
            fetchedMetas = [];
            respErrs = [];
            repos = null;
            errorMeta = null;

            function metaYaml(repoId){
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
            }

            repos = [
              {
                full_name: 'userA/repoA',
                default_branch: 'branchA'
              },
              {
                full_name: 'userA/repoB',
                default_branch: 'branchB'
              },
              {
                full_name: 'userA/repoC',
                default_branch: 'branchC'
              }
            ];

            _httpBackend
              .when('GET', /\.repo-meta\.yml/)
              .respond(
              function(method, url, data){
                if (url.match(/repoA/)){
                  return [200, metaYaml('A'), {}]
                }
                if (url.match(/repoB/)){
                  return [200, '---{ malformed: {   version: 1.0 }', {}]
                }
                if (url.match(/repoC/)){
                  return [200, '{ malformed: {   version: 2.0 }', {}]
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
                && meta._ff_meta_.error.name
                && meta._ff_meta_.error.name === 'YAMLException';
            });

            expect(errorMeta.length).toEqual(2);
          });
        });

        xdescribe('placeholder if there are any mandatory fields - currently completely freeform', function(){
        });
      });
    });


  });

})