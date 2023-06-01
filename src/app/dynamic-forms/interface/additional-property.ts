/**
 * Metadata describing a related property that must be updated when a field is changed
 */
export interface IAdditionalProperty {
  /**
   * Indicates that the property exists on the field.cinchyColumn object rather than on the root field object. If
   * both cinchyColumn and linkedColumn are true, cinchyColumn takes priority
   */
  cinchyColumn?: boolean;

  /**
   * Indicates that the property exists on the field.linkedColumn object rather than on the root field object
   */
  linkedColumn?: boolean;

  /**
   * The name of the property to be updated
   */
  propertyName: string;

  /**
   * The desired value of the property
   */
  propertyValue: any;
}
