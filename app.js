// Generated by CoffeeScript 1.8.0
(function() {
  var ENEM_END, ENEM_RES_HEAD, Evernote, MIME_TO_EXTESION_MAPPING, argv, async, creatImportNote, createENEM_HEAD, createENEM_RES_END, createEmailNote, createHashHex, crypto, email, filterImg, fs, fse, limit, mime, noteStore, pwd, readImg, shell, sliceImg;

  noteStore = require('./evernote');

  Evernote = require('evernote').Evernote;

  fs = require('fs');

  crypto = require('crypto');

  mime = require('mime');

  async = require('async');

  fse = require('fs-extra');

  email = require('./email');

  argv = require('optimist').argv;

  MIME_TO_EXTESION_MAPPING = {
    'image/png': '.png',
    'image/jpg': '.jpg',
    'image/jpeg': '.jpg',
    'image/gif': '.gif'
  };

  pwd = process.cwd().split('/');

  createENEM_HEAD = function(title) {
    var xml;
    xml = '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE en-export SYSTEM "http://xml.evernote.com/pub/evernote-export3.dtd"><en-export export-date="20150420T023922Z" application="Evernote" version="Evernote Mac 6.0.8 (451398)"><note><title>' + title;
    xml += '</title><content><![CDATA[<?xml version="1.0" encoding="UTF-8" standalone="no"?><!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd"><en-note>';
    return xml;
  };

  ENEM_END = "</en-note>]]></content><created>" + (new Date()) + "</created><updated>" + (new Date()) + "</updated><note-attributes><latitude>22.60284578376065</latitude><longitude>114.0366381790896</longitude><altitude>87.88452911376953</altitude><author>" + process.env.USER + "</author><source>desktop.mac</source><reminder-order>0</reminder-order></note-attributes>";

  ENEM_RES_HEAD = '<resource><data encoding="base64">';

  createENEM_RES_END = function(res) {
    return "</data><mime>" + res.mime + "</mime><width></width><height></height><duration>0</duration><resource-attributes><file-name>" + res.name + "</file-name></resource-attributes></resource>";
  };


  /* 筛选图片 */

  filterImg = function(limit, cb) {
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


  /* 按限制大小分组图片 */

  sliceImg = function(imgFiles, limit, cb) {
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


  /* 邮件创建笔记 */

  createEmailNote = function(filter) {
    var i, k, mailOption, tmp, v, _i, _len, _results;
    _results = [];
    for (k in filter) {
      v = filter[k];
      mailOption = {
        from: 'yuankui',
        to: 'shasha',
        subject: k,
        attachments: []
      };
      for (_i = 0, _len = v.length; _i < _len; _i++) {
        i = v[_i];
        tmp = {};
        tmp.filename = i;
        tmp.path = i;
        mailOption.attachments.push(tmp);
      }
      _results.push(email.sendMail(mailOption, function(err, info) {
        if (err) {
          return console.log(err);
        }
        return console.log(info);
      }));
    }
    return _results;
  };


  /* 创建导入笔记 */

  creatImportNote = function(filter) {
    var ENEM, enex, i, importScpt, k, scptHead, scptPwd, scptPwdArr, t, tmp, v, _i, _j, _k, _l, _len, _len1, _len2, _len3;
    importScpt = fs.createWriteStream('import.scpt', {
      flags: 'a'
    });
    scptHead = 'tell application "Evernote"';
    scptPwdArr = pwd.slice(1);
    scptPwd = '"Macintosh HD:';
    for (_i = 0, _len = scptPwdArr.length; _i < _len; _i++) {
      i = scptPwdArr[_i];
      scptPwd += i + ":";
    }
    importScpt.write(scptHead);
    for (k in filter) {
      v = filter[k];
      tmp = [];
      ENEM = createENEM_HEAD(pwd[pwd.length - 1] + ' ' + k);
      for (_j = 0, _len1 = v.length; _j < _len1; _j++) {
        i = v[_j];
        readImg(i, function(res) {
          return tmp.push(res);
        });
      }
      for (_k = 0, _len2 = tmp.length; _k < _len2; _k++) {
        t = tmp[_k];
        ENEM += '<div><en-media style="height: auto;" type="' + t.mime + '" hash="' + createHashHex(t.image) + '"/></div>';
      }
      ENEM += ENEM_END;
      for (_l = 0, _len3 = tmp.length; _l < _len3; _l++) {
        t = tmp[_l];
        ENEM += ENEM_RES_HEAD + t.data.bodyHash + createENEM_RES_END(t);
      }
      ENEM += "</note></en-export>";
      enex = fs.createWriteStream(k + '.enex');
      enex.write(ENEM);
    }
    return console.log("all do");
  };


  /* 生成笔记内容HASH */

  createHashHex = function(body) {
    var hashHex, md5;
    md5 = crypto.createHash('md5');
    md5.update(body);
    hashHex = md5.digest('hex');
    return hashHex;
  };


  /* 读取图片返回resource */

  readImg = function(img, cb) {
    var data, hash, image, resource;
    image = fs.readFileSync(img);
    hash = image.toString('base64');
    data = new Evernote.Data();
    data.size = image.length;
    data.bodyHash = hash;
    data.body = image;
    resource = new Evernote.Resource();
    resource.mime = mime.lookup(img);
    resource.data = data;
    resource.name = img;
    resource.image = image;
    return cb(resource);
  };

  shell = function(limit) {
    if (limit == null) {
      limit = 100;
    }
    return async.auto({
      getImg: function(cb) {
        return filterImg(limit, function(err, res) {
          if (err) {
            return console.log(err);
          }
          return cb(null, res);
        });
      },
      filter: [
        'getImg', function(cb, result) {
          var imgs;
          imgs = result.getImg;
          return sliceImg(imgs, limit, function(filter) {
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
          return console.log("copy imgs ok");
        }
      ],
      cImportNote: [
        'filter', function(cb, result) {
          var filter;
          filter = result.filter;
          return creatImportNote(filter);
        }
      ]
    });
  };

  if (argv.l) {
    limit = argv.l;
    shell(limit);
  } else {
    shell();
  }

}).call(this);

//# sourceMappingURL=app.js.map
