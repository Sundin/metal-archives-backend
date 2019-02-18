'use strict';

const cheerio = require('cheerio');
const request = require('request-promise-native');

const logger = require('./util/logger.js');

module.exports = {
    scrapeBandPage: (id) => {
        return new Promise((resolve, reject) => {
            const url = 'https://www.metal-archives.com/band/view/id/' + id;
            logger.info('Scraping ' + url);

            request.get(url).then(body => {
                const $ = cheerio.load(body);
                const bandName = $('h1[class=band_name]').text();

                const bandUrl = $('h1[class=band_name] a').attr('href');

                const photoUrl = $('a[id=photo]').attr('href');
                const logoUrl = $('a[id=logo]').attr('href');

                let bandValues = {};

                const bandKeys = [
                    'country',
                    'location',
                    'status',
                    'active_since',
                    'genre',
                    'themes',
                    'label',
                    'years_active'
                ];

                $('div#band_stats dd').each(function(i, elem) {
                    if (i === 6) {
                        const labelUrl = $(elem).find('a').attr('href');
                        let labelId = '';
                        if (labelUrl) {
                            const splittedUrl = labelUrl.split('/');
                            const splitAgain = splittedUrl[splittedUrl.length - 1].split('#');
                            labelId = splitAgain[0];
                        }

                        const label = {
                            _id: labelId,
                            name: $(elem).text().trim(),
                            url: labelUrl
                        };
                        bandValues.label = label;
                    } else {
                        // TODO: trim tabs in middle of string
                        bandValues[bandKeys[i]] = $(elem).text().trim();
                    }
                });

                const biography = $('div.band_comment').text().trim();

                const members = {
                    current: getMembers(body, 'current'),
                    past: getMembers(body, 'past'),
                    live: getMembers(body, 'live')
                };

                // TODO: make network requests in parallel
                getDiscography(id).then(discography => {
                    const bandData = {
                        band_name: bandName,
                        _id: id,
                        country: bandValues.country,
                        location: bandValues.location,
                        status: bandValues.status,
                        formed_in: bandValues.active_since,
                        genre: bandValues.genre,
                        themes: bandValues.themes,
                        label: bandValues.label,
                        years_active: bandValues.years_active,
                        url: bandUrl,
                        photo_url: photoUrl,
                        logo_url: logoUrl,
                        biography: biography,
                        members: members,
                        discography: discography
                        // TODO: get links
                        // TODO: get similar bands
                    };

                    resolve(bandData);
                });
            }).catch(error => {
                logger.error(error);
                reject(new Error(url + ' failed with status code: ' + error.statusCode));
            });
        });
    }
};

function getDiscography(bandId) {
    return new Promise((resolve, reject) => {
        const url = `https://www.metal-archives.com/band/discography/id/${bandId}/tab/all`;
        logger.info('Scraping discography');

        let discography = [];

        request.get(url).then(body => {
            const $ = cheerio.load(body);

            const discKeys = [
                'name',
                'type',
                'year',
                'reviews'
            ];

            $('tbody tr').each(function(i, album) {
                let disc = {};
                $(album).find('td').each(function(j, item) {
                    disc[discKeys[j]] = $(item).text().trim(); // TODO: trim tabs inside text?
                });
                const albumUrl = $(album).find('a').attr('href');
                const splittedUrl = albumUrl.split('/');
                const id = splittedUrl[splittedUrl.length - 1];

                discography.push({
                    _id: id,
                    url: albumUrl,
                    title: disc.name,
                    type: disc.type,
                    year: disc.year,
                    reviews: disc.reviews
                });
            });

            resolve(discography);
        });
    });
}

function getMembers(page, type) {
    let members = [];
    let member = {};
    const memberKeys = [
        'name',
        'instrument'
    ];

    const $ = cheerio.load(page);
    $(`div#band_tab_members_${type} div table tr.lineupRow`).each(function(i, memberData) {
        $(memberData).find('td').each(function(j, item) {
            member[memberKeys[(j + 2) % 2]] = $(item).text().trim(); // TODO: trim middle of string?
            if ((j + 2) % 2 === 0) {
                const url = $(item).find('a').attr('href');
                const splittedUrl = url.split('/');
                member._id = splittedUrl[splittedUrl.length - 1];
                member.url = url;
            } else if ((j + 2) % 2 === 1) {
                members.push(member);
                member = {};
            }
        });

        const nextTag = $(memberData).next();

        if (nextTag && $(nextTag).hasClass('lineupBandsRow')) {
            $(nextTag).find('td').each(function(k, item) {
                let otherBands = [];
                $(item).find('a').each(function(j, also) {
                    let band = {};
                    band.band_name = $(also).text().trim(); // TODO: trim middle of string?
                    const url = $(also).attr('href');
                    const splittedUrl = url.split('/');
                    band._id = splittedUrl[splittedUrl.length - 1];

                    const pastMember = $(also).prev().prevObject[0].prev.data.includes('ex-');
                    band.still_member = !pastMember;
                    otherBands.push(band);
                });
                members[i].see_also = otherBands;
            });
        }
    });

    return members;
}
