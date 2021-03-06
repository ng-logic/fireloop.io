declare var module: any;
declare var require: any;
declare var __dirname: any;
var path = require('path');
var changeCase = require('change-case')
var generators = require('yeoman-generator');
const fs = require('fs');
import * as chalk from 'chalk';
import * as ejs from 'ejs';
var _ = require('underscore');
_.mixin(require('underscore.inflections'));
/**
 * @module ServerGenerator [FireLoop]
 * @author Jonathan Casarrubias <t: johncasarrubias, gh:mean-expert-official>
 * @description
 * This module generates and configure a FireLoop Server
 */
module.exports = generators.Base.extend({

  // Not reinventing the wheel, let LoopBack Generator to build the Base.
  initializing: function () {
    this.composeWith('fireloop:model', {
      args: this.options._argv._
    }, { local: require.resolve('generator-fllb/model') });
  },
  // Replace JS Model for TS Model
  end: function () {
    let modelName = this.options._argv._.shift();
    // Get param cased name
    let casedName = changeCase.paramCase(modelName);
    // Update json file with mixins
    let fname  = this.destinationPath(`./common/models/${casedName}.json`);
    let config = require(fname);
    config.mixins = {
      TimeStamp: true,
      Stats: [
        {
            method: 'stats',
            endpoint: '/stats',
            description: `Statistical information for ${modelName} registers.`,
            type: 'model',
            count: {
                on: 'createdAt',
                by: 'index'
            }
        }
      ]
    }
    fs.writeFileSync(fname, JSON.stringify(config, null, 2));
    if (!config.plural) {
      config.plural = _.pluralize(casedName);
    }
    // Replace JS for TS File
    fs.unlinkSync(`./common/models/${casedName}.js`);
    [
      {
        template: 'templates/fireloop/model.ts',
        output: `./common/models/${casedName}.ts`,
        params: { modelName }
      },
      {
        template: 'templates/fireloop/test.spec.ts',
        output: `./tests/${casedName}.spec.ts`,
        params: {
          modelName,
          config,
          propertyBuilder
        }
      }
    ].forEach(
      config => {
        console.info('Generating: %s', `${config.output}`);
        // TODO: Migrate to native yeoman fs library tool
        fs.writeFileSync(
          this.destinationPath(config.output),
          ejs.render(fs.readFileSync(
            require.resolve(`${__dirname}/../../${config.template}`),
            { encoding: 'utf-8' }),
            config.params
          )
        )
      }
    );
  }
});

function propertyBuilder(config: any) {
  let properties: any = [];
  Object.keys(config.properties).forEach((propName: string) => {
    let property: any = config.properties[propName];
    switch (property.type) {
      case 'string':
        properties.push(`\n            ${propName}: 'test'`);
      break;
      case 'number':
        properties.push(`\n            ${propName}: 12345`);
      break;
      case 'date':
        properties.push(`\n            ${propName}: '${ new Date() }'`);
      break;
      case 'geopoint':
        properties.push(`\n            ${propName}: { lat: 100.100, lng: 100.100 }`);
      break;
    }
  });
  return `${ properties.join(`,`) }${ properties.length > 0 ? '\n        ': '' }`;
}
