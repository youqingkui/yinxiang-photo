#!/usr/bin/env node
  var Evernote, MIME_TO_EXTESION_MAPPING, argv, async, crypto, filterImgs, fs, fse, getImgs, limit, mime, noteStore, test;

  noteStore = require('./evernote');

  Evernote = require('evernote').Evernote;

  fs = require('fs');

  crypto = require('crypto');

  mime = require('mime');

  async = require('async');

  fse = require('fs-extra');

  argv = require('optimist').argv;

  MIME_TO_EXTESION_MAPPING = {
    'image/png': '.png',
    'image/jpg': '.jpg',
    'image/jpeg': '.jpg',
    'image/gif': '.gif'
  };

  getImgs = function(limit, cb) {
    if (limit == null) {
      limit = 100;
    }
    return fs.readdir(process.cwd(), function(err, files) {
      var f, imgFiles, type, _i, _len;
      if (err) {
        return cb(err);
      }
      imgFiles = [];
      for (_i = 0, _len = files.length; _i < _len; _i++) {
        f = files[_i];
        type = mime.lookup(f);
        if (type in MIME_TO_EXTESION_MAPPING && fs.statSync(f).size < 1024 * 1024 * limit) {
          imgFiles.push(f);
        }
      }
      return cb(null, imgFiles);
    });
  };

  filterImgs = function(imgFiles, limit, cb) {
    var count, filter, index, k, v, _i, _len;
    if (limit == null) {
      limit = 100;
    }
    filter = {};
    index = 1;
    count = 0;
    for (v = _i = 0, _len = imgFiles.length; _i < _len; v = ++_i) {
      k = imgFiles[v];
      if (!filter[index]) {
        filter[index] = [];
      }
      count += fs.statSync(k).size;
      if (count < 1024 * 1024 * limit) {
        filter[index].push(k);
      } else {
        index += 1;
        if (fs.statSync(k).size < 1024 * 1024 * limit) {
          filter[index] = [];
          filter[index].push(k);
          count = fs.statSync(k).size;
        }
      }
    }
    return cb(filter);
  };

  test = function(limit) {
    if (limit == null) {
      limit = 100;
    }
    return async.auto({
      getImg: function(cb) {
        return getImgs(limit, function(err, res) {
          if (err) {
            return console.log(err);
          }
          return cb(null, res);
        });
      },
      filter: [
        'getImg', function(cb, result) {
          var imgs;
          console.log("limit");
          imgs = result.getImg;
          return filterImgs(imgs, limit, function(filter) {
            return cb(null, filter);
          });
        }
      ],
      copFile: [
        'filter', function(cb, result) {
          var filter, i, k, v, _i, _len;
          filter = result.filter;
          console.log(filter);
          for (k in filter) {
            v = filter[k];
            for (_i = 0, _len = v.length; _i < _len; _i++) {
              i = v[_i];
              if (fs.existsSync(k)) {
                fse.copySync(i, k + '/' + i);
              } else {
                fs.mkdirSync(k);
                fse.copySync(i, k + '/' + i);
              }
            }
          }
          return console.log("ok");
        }
      ]
    });
  };

  if (argv.l) {
    limit = argv.l;
    test(limit);
  } else {
    test();
  }

