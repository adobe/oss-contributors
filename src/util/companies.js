/*
Copyright 2019 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

module.exports = {
    is_empty: (co) => {
        if (!co || co.length === 0) return true;

        let n = co.toLowerCase();
        return n === 'null' || n === 'na' || n === 'n/a' || n === 'none' || n === '-' || n === 'no' || n === '.';

    },
    is_corporation: (co) => {
        let n = co.toLowerCase();
        return n.indexOf('freelance') === -1 && n.indexOf('student') === -1 &&
            n.indexOf('university') === -1 && n.indexOf('self') === -1 &&
            n.indexOf('personal') === -1 && n !== 'mit' && n !== 'uc berkeley' &&
            n !== 'china' && n !== 'japan' && n.indexOf('college') === -1 &&
            n !== 'ucla' && n.indexOf('independent') === -1 && n !== 'sjtu' &&
            n !== 'virginia tech' && n !== 'myself' && n.indexOf('institute of tech') === -1 &&
            n !== 'georgia tech' && n !== 'uc davis' && n !== 'ucsd' && n !== 'uc san diego' &&
            n.indexOf('individual') === -1;
    },
    catch_all: /microsoft|google|amazon|amzn|aws|red hat|redhat|ibm|pivotal|intel|facebook|alibaba|uber|wix|github|tencent|baidu|apple||mozilla|oracle|shopify|mongodb|vmware|netflix|salesforce|linkedin|palantir|yahoo|mapbox|unity|automattic|travis|spotify|zalando|esri|sap|epam|telerik|stripe|kitware|suse|odoo|yandex|adobe|airbnb|guardian|docker|nuxeo|nvidia|elastic|yelp|wso2|inria|puppet|datadog|jetbrains|canonical|rackspace|thoughtworks|andela|liferay|epfl|cnrs|embl|european bioinformatics|accenture|cisco|ericsson|capital one|huawei|booking\.com|netease|bbc|nokia|zendesk|paypal|eth z|samsung|slack|twitter|lyft|snapchat|zeit|atlassian|square|wechat|wikimedia|observable|magento|behance|aviary|fotolia/gi,
    map: {
        microsoft: 'Microsoft',
        google: 'Google',
        amazon: 'Amazon',
        amzn: 'Amazon',
        aws: 'Amazon',
        'red hat': 'Red Hat',
        redhat: 'Red Hat',
        ibm: 'IBM',
        pivotal: 'Pivotal',
        intel: 'Intel',
        facebook: 'Facebook',
        alibaba: 'Alibaba',
        uber: 'Uber',
        wix: 'WIX',
        github: 'Microsoft',
        tencent: 'Tencent',
        baidu: 'Baidu',
        apple: 'Apple',
        '': 'Apple',
        mozilla: 'Mozilla',
        oracle: 'Oracle',
        shopify: 'Shopify',
        mongodb: 'MongoDB',
        vmware: 'VMWare',
        netflix: 'Netflix',
        salesforce: 'Salesforce',
        linkedin: 'LinkedIn',
        palantir: 'Palantir Technologies',
        yahoo: 'Yahoo!',
        mapbox: 'Mapbox',
        unity: 'Unity Technologies',
        automattic: 'Automattic',
        travis: 'Travis CI',
        spotify: 'Spotify',
        zalando: 'Zalando DE',
        esri: 'ESRI',
        sap: 'SAP SE',
        epam: 'EPAM Systems',
        telerik: 'Telerik',
        stripe: 'Stripe',
        kitware: 'Kitware',
        suse: 'SUSE',
        odoo: 'Odoo',
        yandex: 'Yandex',
        adobe: 'Adobe',
        magento: 'Adobe',
        behance: 'Adobe',
        aviary: 'Adobe',
        fotolia: 'Adobe',
        airbnb: 'Airbnb',
        guardian: 'The Guardian',
        docker: 'Docker',
        nuxeo: 'Nuxeo',
        nvidia: 'NVIDIA',
        elastic: 'Elastic',
        yelp: 'Yelp',
        wso2: 'WSO2',
        inria: 'INRIA',
        puppet: 'Puppet Labs',
        datadog: 'DataDog',
        jetbrains: 'JetBrains',
        canonical: 'Canonical',
        rackspace: 'Rackspace',
        thoughtworks: 'ThoughtWorks',
        andela: 'Andela',
        liferay: 'Liferay',
        epfl: 'EPFL',
        cnrs: 'CNRS',
        embl: 'EMBL-EBI',
        'european bioinformatics': 'EMBL-EBI',
        cisco: {
            ignore: /francisco/i,
            label: 'Cisco Systems'
        },
        accenture: 'Accenture',
        ericsson: 'Ericsson',
        'capital one': 'Capital One',
        huawei: 'Huawei',
        'booking.com': 'Booking.com',
        netease: 'NetEase',
        bbc: 'BBC',
        nokia: 'Nokia',
        zendesk: 'Zendesk',
        paypal: 'PayPal',
        'eth z': 'ETH Zurich',
        samsung: 'Samsung',
        slack: 'Slack',
        twitter: 'Twitter',
        lyft: 'Lyft',
        snapchat: 'Snapchat',
        zeit: 'Zeit',
        atlassian: 'Atlassian',
        square: 'Square, Inc.',
        wechat: 'WeChat',
        wikimedia: 'WikiMedia Foundation',
        observable: 'Observable'
    }
};
