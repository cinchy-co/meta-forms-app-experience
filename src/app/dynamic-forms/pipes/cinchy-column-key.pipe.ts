import { Pipe, PipeTransform } from '@angular/core';
import { isNullOrUndefined } from 'util';
@Pipe({ name: 'keys',  pure: false })
/**
 * Pipe for creating a dynamic table from array
 * Key = heading or property name of table
 * value is the value of property
 */
export class KeysPipe implements PipeTransform {
  transform(obj: Object, args: any[] = null): any {
      let array = [];
      Object.keys(obj).forEach(key => {

          array.push({
              value: obj[key],
              key: key
          });
      });
      return array;
  }
}
