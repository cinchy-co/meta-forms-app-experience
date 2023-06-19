/**
 * Metadata describing a related property that must be updated when a field is changed
 */
export interface IAdditionalProperty {
  /**
   * Indicates that the property exists on the field.cinchyColumn object rather than on the root field object
   */
  cinchyColumn?: boolean;

  /**
   * The name of the property to be updated
   */
  propertyName: string;

  /**
   * The desired value of the property
   */
  propertyValue: any;
}
