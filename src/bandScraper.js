'use strict';

const cheerio = require('cheerio');
const request = require('request-promise-native');

const logger = require('./util/logger.js');

module.exports = {
    scrapeBandPage: (bandName, id) => {
        return new Promise((resolve, reject) => {
            const url = 'https://www.metal-archives.com/bands/' + bandName + '/' + id;
            logger.info('Scraping ' + url);

            request.get(url).then(body => {
                const $ = cheerio.load(body);
                const bandName = $('h1[class=band_name]').text();

                const bandUrl = $('h1[class=band_name] a').attr('href');
                const splitUrl = bandUrl.split('/');
                const id = splitUrl[splitUrl.length - 1];

                const photoUrl = $('a[id=photo]').attr('href');
                const logoUrl = $('a[id=photo]').attr('href');

                let band_values = {};

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
                        const label_url = $(elem).find('a').attr('href');
                        let label_id = '';
                        if (label_url) {
                            const splitted_url = label_url.split('/');
                            const split_again = splitted_url[splitted_url.length - 1].split('#');
                            label_id = split_again[0];
                        }

                        const label = {
                            _id: label_id,
                            name: $(elem).text().trim(),
                            url: label_url
                        };
                        band_values.label = label;
                    } else {
                        // TODO: trim tabs in middle of string
                        band_values[bandKeys[i]] = $(elem).text().trim();
                    }
                });

                const biography = $('div.band_comment').text().trim();

                const members = {
                    current: getMembers(body, 'current'),
                    past: getMembers(body, 'past'),
                    live: getMembers(body, 'live')
                };

                getDiscography(id).then(discography => {
                    const bandData = {
                        band_name: bandName,
                        _id: id,
                        country: band_values.country,
                        location: band_values.location,
                        status: band_values.status,
                        formed_in: band_values.active_since,
                        genre: band_values.genre,
                        themes: band_values.themes,
                        label: band_values.label,
                        years_active: band_values.years_active,
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

            const discog_keys = [
                'name',
                'type',
                'year',
                'reviews'
            ];

            $('tbody tr').each(function(i, album) {
                let disc = {};
                $(album).find('td').each(function(j, item) {
                    disc[discog_keys[j]] = $(item).text().trim(); // TODO: trim tabs inside text?
                });
                const albumUrl = $(album).find('a').attr('href');
                const splitted_url = albumUrl.split('/');
                const id = splitted_url[splitted_url.length - 1];

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
    const member_keys = [
        'name',
        'instrument'
    ];

    const $ = cheerio.load(page);
    $(`div#band_tab_members_${type} div table tr.lineupRow`).each(function(i, member_data) {
        $(member_data).find('td').each(function(j, item) {
            member[member_keys[(j + 2) % 2]] = $(item).text().trim(); // TODO: trim middle of string?
            if ((j + 2) % 2 === 0) {
                const url = $(item).find('a').attr('href');
                const splitted_url = url.split('/');
                member._id = splitted_url[splitted_url.length - 1];
                member.url = url;
            } else if ((j + 2) % 2 === 1) {
                members.push(member);
                member = {};
            }
        });

        const next_tag = $(member_data).next();

        if (next_tag && $(next_tag).hasClass('lineupBandsRow')) {
            $(next_tag).find('td').each(function(k, item) {
                let also_array = [];
                $(item).find('a').each(function(j, also) {
                    let other_band = {};
                    other_band.band_name = $(also).text().trim(); // TODO: trim middle of string?
                    const url = $(also).attr('href');
                    const splitted_url = url.split('/');
                    other_band._id = splitted_url[splitted_url.length - 1];

                    const pastMember = $(also).prev().prevObject[0].prev.data.includes('ex-');
                    other_band.still_member = !pastMember;
                    also_array.push(other_band);
                });
                members[i].see_also = also_array;
            });
        }
    });

    return members;
}
