'use strict';

var s3 = require('s3'),
  log = require('winston');

var keyId = process.env.S3_ACCESS_KEY_ID;
var secret = process.env.S3_SECRET_ACCESS_KEY;


if (!keyId || !secret) {
  console.log('Missing env info, make sure S3 is configured ' + JSON.stringify(process.env));
  process.exit(1);
}


var client = s3.createClient({
  maxAsyncS3: 20, // this is the default
  s3RetryCount: 3, // this is the default
  s3RetryDelay: 1000, // this is the default
  multipartUploadThreshold: 20971520, // this is the default (20 MB)
  multipartUploadSize: 15728640, // this is the default (15 MB)
  s3Options: {
    accessKeyId: keyId,
		secretAccessKey: secret}
});



module.exports = {
  uploadDir: function(dir, endDir, cb) {
//client.config.update({region: 'eu-west-1'});
    var params = {
      localDir: dir,
      deleteRemoved: false,
      s3Params: {
        Bucket: 'report.mage.coach',
        Prefix: endDir
      }
    };

    var uploader = client.uploadDir(params);

    uploader.on('error', function(err) {
      log.error('Unable to s3 sync ', err.stack);
      cb(err);
    });

    uploader.on('progress', function() {
//      log.debug('Uploading ', uploader.progressAmount, uploader.progressTotal);
    });

    uploader.on('end', function() {
//      log.debug('finished uploading');
      cb();
    });
  }
};
