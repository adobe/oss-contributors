CREATE TABLE `usercompany` (
  `user` varchar(100) NOT NULL COMMENT 'github username',
  `company` varchar(256) NOT NULL COMMENT 'company field from github, slightly sanitized via tool',
  `fingerprint` varchar(32) NOT NULL COMMENT 'etag value returned from GitHub REST API - cachebusting for profile updates',
  PRIMARY KEY (`user`),
  UNIQUE KEY `user_UNIQUE` (`user`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
