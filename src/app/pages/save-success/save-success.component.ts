import {Component, OnInit} from "@angular/core";
import {CinchyService} from "@cinchy-co/angular-sdk";
import { AppStateService } from "../../services/app-state.service";

@Component({
  selector: "app-save-success",
  templateUrl: "./save-success.component.html",
  styleUrls: ["./save-success.component.scss"]
})
export class SaveSuccessComponent implements OnInit {

  formId: string;
  assignedSeat;
  mapPath: string;
  seatPath: string;
  seatDetails;

  constructor(
    private _appStateService: AppStateService,
    private _cinchyService: CinchyService
  ) {}


  ngOnInit(): void {

    this.formId = this._appStateService.formId;

    // Calling queries in this component only as it is ONLY SPECIFIC to ONE page and ONE FORM
    this.formId === "11" && this.getSeatingInformation();
  }


  async getSeatingInformation() {

    try {
      const seatResp = await this._cinchyService.executeQuery(
        "Human Resources",
        "Get Assigned Seat",
        null
      ).toPromise();

      this.seatDetails = seatResp.queryResult.toObjectArray()[0];
      this.assignedSeat = this.seatDetails ? this.seatDetails["Seat Number"] : null;
      this.mapPath = `assets/images/seat-map/${this.seatDetails["Office Location Map Path"]}`;
      this.seatPath = `assets/images/seat-map/${this.seatDetails["Seat Map Image Path"]}`;

      const adjacentSeats = this.seatDetails["Adjacent Seat All"] || "";

      await this._cinchyService.executeQuery(
        "Human Resources", "Set Assigned Seat",
        {
          "@seatNumber": this.assignedSeat
        }
      ).toPromise();

      await this._cinchyService.executeQuery(
        "Human Resources",
        "Set Restricted Seats",
        {
          "{0}": adjacentSeats.toString()
        }
      ).toPromise();

      console.log("this.assignedSeat", this.seatDetails);
    } catch (e) {

    }
  }
}
