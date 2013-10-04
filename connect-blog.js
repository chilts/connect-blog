// ----------------------------------------------------------------------------
//
// connect-blog.js - Blog middleware you can add to your Connect/Express app.
//
// Copyright (c) 2013 Andrew Chilton. All rights resered.
//
// License: http://chilts.mit-license.org/2013/
//
// ----------------------------------------------------------------------------

// core
var fs = require('fs');

// npm
var marked = require('marked');

// ----------------------------------------------------------------------------

module.exports = function(opts) {
    console.log('opts:', opts);

    if ( !opts.contentDir ) {
        throw new Error("Provide a contentDir");
    }

    var post  = {};
    var posts = [];

    // read all the files from the content dir
    var files = fs.readdirSync(opts.contentDir);
    files.forEach(function(filename) {
        var parts = filename.split(/\./);
        var basename = parts[0];
        var ext = parts[1];

        post[basename] = post[basename] || {};

        var contents = fs.readFileSync(opts.contentDir + '/' + filename, 'utf8');

        if ( ext === 'json' ) {
            post[basename].meta = JSON.parse(contents);
            post[basename].meta.datetime = new Date(post[basename].meta.datetime);
        }
        if ( ext === 'md' ) {
            post[basename].content = contents;
            post[basename].html = marked(contents);
        }
        
    });

    // sort the posts by chronological order
    posts = Object.keys(post).map(function(name) {
        // get the post itself
        return post[name];
    }).sort(function(a, b) {
        // sort on datetime
        return a.meta.datetime > b.meta.datetime;
    });

    return function(req, res, next) {
        if ( false ) {
            console.log('--- connect-blog ---');
            console.log('path=' + req.path);
            console.log('url=' + req.url);
            console.log('params:', req.params);
            console.log('query:', req.query);
            console.log('body:', req.body);
        }

        var path = req.params.path;
        if ( !path ) {
            return res.send('Blog');
        }

        // look for a page that looks like a blog
        if ( path === 'rss20.xml' ) {
            return res.send('RSS Feed');
        }

        if ( path === 'atom.xml' ) {
            return res.send('Atom Feed');
        }

        if ( path === 'archive' ) {
            return res.send('The Archive');
        }

        if ( path.indexOf('archive:') === 0 ) {
            return res.send('An Archive');
        }

        if ( path.indexOf('tag:') === 0 ) {
            return res.send('A Tag');
        }

        // is this a post
        if ( post[path] ) {
            return res.render('blog-post', {
                post  : post[path],
                posts : posts,
            });
        }

        // didn't find anything interesting, pass it on
        next();
    };
};

// ----------------------------------------------------------------------------
