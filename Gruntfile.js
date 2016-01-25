module.exports = function (grunt) {
    'use strict';

    // Load the grunt tasks
    require('load-grunt-tasks')(grunt);

    // Time the grunt tasks
    require('time-grunt')(grunt);

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        meta: {
            banner: [
                '/**',
                ' * <%= pkg.description %>',
                ' * @version v<%= pkg.version %> - <%= grunt.template.today("yyyy-mm-dd") %>',
                ' * @link <%= pkg.homepage %>',
                ' * @author <%= pkg.author %>',
                ' * @license Apache 2.0 License, https://opensource.org/licenses/Apache-2.0',
                ' */'
            ].join('\n')
        },
        dirs: {
            dest: 'dist',
            coverage: 'coverage'
        }, 
        concat: {
            options: {
                banner: '<%= meta.banner %>' + '\n' +
                        '(function ( window, angular, undefined ) {' + '\n',
                footer: '\n})( window, window.angular );'
            },
            dist: {
                src: ['src/tokenAuthService.js','src/generateLogoutURL.js','src/queryStringParams.js','src/filterTokenRequestBuffer.js','src/tokenAuthInterceptor.js','src/tokenAuthInitiator.js'],
                dest: '<%= dirs.dest %>/<%= pkg.name %>.js'
            }
        },
        uglify: {
            options: {
                banner: '<%= meta.banner %>'
            },
            dist: {
                src: ['<%= concat.dist.dest %>'],
                dest: '<%= dirs.dest %>/<%= pkg.name %>.min.js'
            }
        },
        // Zips the dist to a file
        compress: {
            dist: {
                options: {
                    archive: '<%= dirs.dest %>/<%= pkg.name %>.zip'
                },
                files: [
                    {
                        expand: true,
                        dot: true,
                        src: '**/*.js',
                        cwd: '<%= dirs.dest %>'
                    }
                ]
            }
        },
        // Empties folders to start fresh
        clean: {
            dist: {
                files: [
                    {
                        dot: true,
                        src: [
                            '<%= dirs.dest %>/{,*/}*',
                            '<%= dirs.coverage %>/{,*/}*',
                            '!<%= dirs.dest %>/.git*'
                        ]
                    }
                ]
            }
        },
        karma: {
            options: {
                autowatch: true,
                configFile: 'test/karma.conf.js'
            },
            unit: {}
        },
        jshint: {
            grunt: {
                src: ['Gruntfile.js'],
                options: {
                    node: true
                }
            },
            dev: {
                src: '<%= concat.dist.src %>',
                options: {}
            },
            test: {
                src: ['test/spec/**/*.js'],
                options: {
                    jshintrc: 'test/.jshintrc'
                }
            }
        }
    });

    grunt.registerTask('test', [
        'karma'
    ]);

    grunt.registerTask('default', [
        'jshint',
        'test'
    ]);
    
    grunt.registerTask('dist', [
        'clean',
        'concat',
        'uglify',
        'compress'
    ]);
};
