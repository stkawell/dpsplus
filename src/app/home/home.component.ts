import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material';
import { SwUpdate } from '@angular/service-worker';
import { FormBuilder, FormGroup } from '@angular/forms';
import { map } from 'rxjs/operators/map';
import { SearchInput } from '../shared/interfaces';
import { DpsPlusQueryType, SearchInputType, SearchResultsColumn, PokemonModel, SearchTypeModel, TypeInput, WeatherInput, SearchInputDefinition } from '../shared/models';
import { DataService } from '../shared/services/data.service';
import { DpsPlusService } from '../shared/services/dpsplus.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {

  public inputsForm: FormGroup;
  public searchTypes: SearchTypeModel[] = [];
  public defenderInput: PokemonModel;
  public pokemonInputs: PokemonModel[] = [];
  public weatherInput: WeatherInput;
  public typeInput: TypeInput;
  public pokemonSetCount = 0;
  public maxAddablePokemon: number = 0;
  public currentPokemonSetDef: SearchInputDefinition;
  public results: any[] = [];
  public displayedColumns: string[] = [];
  public columns: SearchResultsColumn[] = [];
  public isLoading = true;

  // These private "shadow" lists keep all the previous input objects in memory, even if removed from display
  private shadowDefenderInput: PokemonModel;
  private shadowPokemonInputs: PokemonModel[] = [];
  private shadowWeatherInput: WeatherInput;
  private shadowTypeInput: TypeInput;

  private defaultSearchType: DpsPlusQueryType = DpsPlusQueryType.CountersVsPokemon;

  constructor(
      private formBuilder: FormBuilder,
      private dataService: DataService,
      private dpsPlusService: DpsPlusService,
      private swUpdate: SwUpdate,
      private snackBar: MatSnackBar
    ) {
    this.inputsForm = this.formBuilder.group({
      pokemon: this.formBuilder.array([]),
      weather: '',
      type1: '',
      type2: '',
    })
  }

  ngOnInit() {
    this.searchTypes = this.dpsPlusService.SearchTypes;
    if (this.dataService.isLoaded) {
      this.isLoading = false;
      this.setSelectedSearchTypeByCode(this.defaultSearchType);
    }
    else {
      this.dataService.load(() => {
        this.isLoading = false;
        this.setSelectedSearchTypeByCode(this.defaultSearchType);
      });
    }

    if (this.swUpdate.isEnabled) {
      this.swUpdate.available.subscribe(event => {
        console.log('A newer version is now available. Refresh the page now to update the cache.');
        this.snackBar.open("Refresh page to update.");
      });
      this.swUpdate.checkForUpdate();
    }
  }

  runQuery() {
    if (this.selectedSearchType) {
      const allPokemon = this.pokemonInputs.concat(this.defenderInput ? [ this.defenderInput ] : []);
      console.log('Running query: ', this.selectedSearchType, allPokemon, this.weatherInput, this.typeInput);

      this.results = [];
      this.columns.splice(0, this.columns.length);
      this.displayedColumns.splice(0, this.displayedColumns.length);
      for (let column of this.selectedSearchType.columns) {
        this.columns.push(column);
        this.displayedColumns.push(column.name);
      }

      let queryResults = this.dpsPlusService.runQuery(this.selectedSearchType.code, allPokemon, this.weatherInput, this.typeInput);
      if (queryResults)
        this.results = queryResults;
    }
  }

  private setSelectedSearchTypeByCode(code: DpsPlusQueryType) {
    for (let searchType of this.searchTypes) {
      if (searchType.code === code) {
        this.selectedSearchType = searchType;
        break;
      }
    }
  }

  private _selectedSearchType: SearchTypeModel;
  get selectedSearchType(): SearchTypeModel {
    return this._selectedSearchType;
  }
  set selectedSearchType(selectedSearchType: SearchTypeModel) {
    this._selectedSearchType = selectedSearchType;

    if (this.isLoading) {
      this.defaultSearchType = selectedSearchType.code;
    }
    else {
      this.defenderInput = null;
      this.pokemonInputs = []; let pokemonIndex = 0;
      this.weatherInput = null;
      this.typeInput = null;
      this.maxAddablePokemon = 0;
      this.resetPokemonFormArray();

      for (let input of selectedSearchType.inputs) {

        if (input.type == SearchInputType.Defender) {
          if (!this.shadowDefenderInput) {
            this.shadowDefenderInput = new PokemonModel(249, this.dataService, input.code, input.name, false, false);
          }
          this.shadowDefenderInput.internalId = input.code;
          this.shadowDefenderInput.internalTitle = input.name;
          this.shadowDefenderInput.level = 40;
          this.shadowDefenderInput.attackIv = 15;
          this.shadowDefenderInput.defenseIv = 15;
          this.shadowDefenderInput.staminaIv = 15;
          this.defenderInput = this.shadowDefenderInput;
        }

        if (input.type == SearchInputType.Pokemon) {
          this.addPokemon(input.code, input.name, false, pokemonIndex++);
        }

        if (input.type == SearchInputType.PokemonSet) {
          this.pokemonSetCount = 0;
          for (let i = 0; i < input.options.default; i++) {
            this.addPokemonFromSet(input, pokemonIndex++);
          }
          this.currentPokemonSetDef = input;
          this.maxAddablePokemon = input.options.max;
        }

        if (input.type == SearchInputType.Weather) {
          if (!this.shadowWeatherInput) { // we don't have a shadow weather in memory
            this.shadowWeatherInput = new WeatherInput(input.code, input.name);
          }
          this.weatherInput = this.shadowWeatherInput;
        }

        if (input.type == SearchInputType.Type) {
          if (!this.shadowTypeInput) { // we don't have a shadow type in memory
            this.shadowTypeInput = new TypeInput(input.code, input.name, this.dataService);
          }
          this.typeInput = this.shadowTypeInput;
        }
      }
    }
  }

  private addPokemonFromSet(input: SearchInputDefinition, atIndex: number) {
    this.addPokemon(input.code + this.pokemonSetCount, input.name + (this.pokemonSetCount + 1), this.pokemonSetCount >= input.options.min, atIndex);
    this.pokemonSetCount++;
  }

  private addPokemon(code: string, title: string, isRemovable: boolean, atIndex: number) {
    if (this.shadowPokemonInputs.length <= atIndex) { // we don't have a shadow pokemon in memory
      let defaultPokemon = atIndex == 0 ? 149 : (atIndex == 1 ? 384 : (Math.floor(Math.random() * 386) + 1));
      const newPokemon = new PokemonModel(defaultPokemon, this.dataService, code, title, isRemovable, false);
      this.shadowPokemonInputs.push(newPokemon);
    }
    else { // we do have a shadow pokemon, and need to update the code and title
      const shadow = this.shadowPokemonInputs[atIndex];
      shadow.internalId = code;
      shadow.internalTitle = title;
      shadow.isRemovable = isRemovable;
      shadow.canSelectMoves = false;
    }
    const pokemon = this.shadowPokemonInputs[atIndex];
    if (code.toLowerCase().startsWith('defend')) {
      pokemon.level = 40;
      pokemon.attackIv = 15;
      pokemon.defenseIv = 15;
      pokemon.staminaIv = 15;
    }
    else {
      pokemon.level = 30;
      pokemon.attackIv = 10;
      pokemon.defenseIv = 10;
      pokemon.staminaIv = 10;
    }
    this.pokemonInputs.push(pokemon);
    this.resetPokemonFormArray();
  }

  public removePokemon(id: string) {
    let pokemonIndex = -1;
    for (let input of this.pokemonInputs) {
      if (input.internalId == id) pokemonIndex = this.pokemonInputs.indexOf(input);
    }
    if (pokemonIndex >= 0) {
      this.pokemonSetCount--; // only set pokemon can be removed

      // move the removed pokemon to the end of the shadow list
      let tempShadow = this.shadowPokemonInputs[pokemonIndex];
      this.shadowPokemonInputs.splice(pokemonIndex, 1);
      this.shadowPokemonInputs.push(tempShadow);

      // remove the pokemon
      this.pokemonInputs.splice(pokemonIndex, 1);
      this.resetPokemonFormArray();
    }

    // check search query input types for the PokemonSet input type to reset the list title numbers
    let nonSetPokemonCount = 0;
    for (let input of this._selectedSearchType.inputs) {
      if (input.type === SearchInputType.Pokemon) {
        nonSetPokemonCount++;
      }
      else if (input.type === SearchInputType.PokemonSet) {
        for (let i = nonSetPokemonCount; i < this.pokemonInputs.length; i++) {
          this.pokemonInputs[i].internalId = input.code + (i - nonSetPokemonCount);
          this.pokemonInputs[i].internalTitle = input.name + (i - nonSetPokemonCount + 1);
          this.shadowPokemonInputs[i].internalId = input.code + (i - nonSetPokemonCount);
          this.shadowPokemonInputs[i].internalTitle = input.name + (i - nonSetPokemonCount + 1);
        }
        break;
      }
    }

  }

  private resetPokemonFormArray() {
    // const pokemonFormGroups = this.pokemonInputs.map(input => this.formBuilder.group(input));
    // const pokemonFormArray = this.formBuilder.array(pokemonFormGroups);
    // console.log('Updating array with ' + pokemonFormArray.controls.length + ' items.');
    // this.inputsForm.setControl('pokemon', pokemonFormArray);
  }

  public triggerAddPokemon() {
    if (this.pokemonSetCount < this.maxAddablePokemon && this.currentPokemonSetDef) {
      this.addPokemonFromSet(this.currentPokemonSetDef, this.pokemonInputs.length);
    }
  }

  public calculateFromPokedex() {
    // remove all attackers
    this.pokemonInputs = [];
    this.pokemonSetCount = 0;
    
    this.runQuery();
  }

  public massageDataCell(columnName: string, value: any): any {
    if (columnName.startsWith('dpsPlus') || columnName.startsWith('tank')) {
      return this.precisionRound(value, 1);
    }
    else {
      return value;
    }
  }

  private precisionRound(number, precision): number {
    let factor = Math.pow(10, precision);
    return Math.round(number * factor) / factor;
  }
}
