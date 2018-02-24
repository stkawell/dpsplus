import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material';
import { SwUpdate } from '@angular/service-worker';
import { SearchInput } from '../shared/searchInput';
import { PokemonModel, SearchTypeModel, PokemonInput, TypeInput, WeatherInput } from '../shared/models';
import { DataService } from '../shared/services/data.service';
import { DpsPlusService } from '../shared/services/dpsplus.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {

  public searchTypes: SearchTypeModel[] = [];
  public pokemonInputs: PokemonInput[] = [];
  public weatherInputs: WeatherInput[] = [];
  public typeInputs: TypeInput[] = [];
  public pokemonList: any[] = [];
  public results: any[] = [];
  public displayedColumns: string[] = [ 'quickMove', 'chargeMove', 'dpsPlus' ];

  // These private "shadow" lists keep all the previous input objects in memory, even if removed from display
  private shadowPokemonInputs: PokemonModel[] = [];
  private shadowWeatherInputs: WeatherInput[] = [];
  private shadowTypeInputs: TypeInput[] = [];

  constructor(
      private dataService: DataService,
      private dpsPlusService: DpsPlusService,
      private swUpdate: SwUpdate,
      private snackBar: MatSnackBar
    ) {
    this.searchTypes.push(new SearchTypeModel(0, 'Pokemon', 'Best General Moves'));
    this.searchTypes.push(new SearchTypeModel(1, 'PokemonVsType', 'Best Moves Vs. Type'));
    this.searchTypes.push(new SearchTypeModel(2, 'PokemonVsPokemon', 'Best Moves Vs. Pokémon'));

    if (this.dataService.isLoaded) {
      this.importPokedex(this.dataService.getPokedex());
      this.selectedSearchType = 'PokemonVsPokemon';
    }
    else {
      this.dataService.load(() => {
        this.importPokedex(this.dataService.getPokedex());
        this.selectedSearchType = 'PokemonVsPokemon';
      });
    }
  }

  ngOnInit() {
    if (this.swUpdate.isEnabled) {
      this.swUpdate.available.subscribe(event => {
        console.log('A newer version is now available. Refresh the page now to update the cache.');
        this.snackBar.open("Refresh page to update.");
      });
      this.swUpdate.checkForUpdate();
    }
  }

  runQuery() {
    console.log('Running query: ', this.selectedSearchType, this.pokemonInputs, this.weatherInputs, this.typeInputs);
    for (let mon of this.pokemonInputs) {
      console.log(mon.name + ": ", mon.value);
    }
    for (let type of this.typeInputs) {
      console.log(type.name + ": ", type);
    }
    for (let weather of this.weatherInputs) {
        console.log(weather.name + ": ", weather);
    }

    if (this.selectedSearchType == 'Pokemon') {
      this.results = this.dpsPlusService.movesetListDPSPlusPoke(this.pokemonInputs[0]);
    }
    else if (this.selectedSearchType == 'PokemonVsType') {
      this.results = this.dpsPlusService.movesetListDPSPlusPokeVsType(this.pokemonInputs[0], this.typeInputs[0]);
    }
    else if (this._selectedSearchType == 'PokemonVsPokemon') {
      this.results = this.dpsPlusService.movesetListDPSPlusPokeVsPoke(this.pokemonInputs[0], this.pokemonInputs[1], this.weatherInputs[0]);
    }
    else {
      this.results = [];
    }
    console.log('DPS+ results: ', this.results);
  }

  private importPokedex(pokedex: any[]) {
    this.pokemonList = pokedex.sort((a, b) => {
      let aLower = a[0].toLowerCase(), bLower = b[0].toLowerCase();
      return (aLower < bLower) ? -1 : ((aLower > bLower) ? 1 : 0);
    });
  }

  private _selectedSearchType: string;
  get selectedSearchType(): string {
    return this._selectedSearchType;
  }
  set selectedSearchType(selectedSearchType: string) {
    this._selectedSearchType = selectedSearchType;

    // configure shadow lists
    if (this.shadowPokemonInputs.length <= 0) {
      this.shadowPokemonInputs.push(new PokemonModel(149, this.dataService));
      this.shadowPokemonInputs.push(new PokemonModel(384, this.dataService));
    }
    if (this.shadowWeatherInputs.length <= 0) {
      this.shadowWeatherInputs.push(new WeatherInput('weather', 'Weather'));
    }
    if (this.shadowTypeInputs.length <= 0) {
      this.shadowTypeInputs.push(new TypeInput('types1', 'Counter Type', this.dataService));
    }

    this.pokemonInputs = [];
    this.weatherInputs = [];
    this.typeInputs = [];

    if (selectedSearchType == 'Pokemon') {
      this.pokemonInputs.push(new PokemonInput('pokemon', 'Pokémon', this.shadowPokemonInputs[0]));
    }
    else if (selectedSearchType == 'PokemonVsType') {
      this.pokemonInputs.push(new PokemonInput('pokemon', 'Pokémon', this.shadowPokemonInputs[0]));
      this.typeInputs.push(this.shadowTypeInputs[0]);
    }
    else if (selectedSearchType == 'PokemonVsPokemon') {
      this.pokemonInputs.push(new PokemonInput('attacker', 'Attacker', this.shadowPokemonInputs[0]));
      this.pokemonInputs.push(new PokemonInput('defender', 'Defender', this.shadowPokemonInputs[1]));
      this.weatherInputs.push(this.shadowWeatherInputs[0]);
    }
  }

  precisionRound(number, precision) {
    let factor = Math.pow(10, precision);
    return Math.round(number * factor) / factor;
  }
}
