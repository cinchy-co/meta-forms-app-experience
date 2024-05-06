/**
 * Metadata describing a related property that must be updated when a field is changed
 */
export interface IAdditionalProperty {
  /**
   * Indicates that the property exists on the field.cinchyColumn object rather than on the root field object
   */
  cinchyColumn?: boolean;

  /**
   * Indicates that the hasChanged value should not be flagged as part of this update, which is useful in cases where
   * data that is meaningful to the application but not meaningful to the form is added
   */
  ignoreChange?: boolean;

  /**
   * The name of the property to be updated
   */
  propertyName: string;

  /**
   * The desired value of the property
   */
  propertyValue: any;
}
