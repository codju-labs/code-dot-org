import React, {Component} from 'react';
import PropTypes from 'prop-types';
import Radium from 'radium';
import color from '@cdo/apps/util/color';
import onClickOutside from 'react-onclickoutside';
import JavalabButton from './JavalabButton';
import msg from '@cdo/locale';
import javalabMsg from '@cdo/javalab/locale';
import {connect} from 'react-redux';
import {DisplayTheme} from './DisplayTheme';
import {makeEnum} from '@cdo/apps/utils';
import JavalabDialog from './JavalabDialog';
import {PaneButton} from '@cdo/apps/templates/PaneHeader';

const Dialog = makeEnum('IMPORT_WARNING', 'IMPORT_ERROR');

/**
 * A button that drops down to a set of importable files, and closes itself if
 * you click on the import button, or outside of the dropdown.
 */
class Backpack extends Component {
  static propTypes = {
    displayTheme: PropTypes.oneOf(Object.values(DisplayTheme)).isRequired,
    isButtonDisabled: PropTypes.bool.isRequired,
    onImport: PropTypes.func.isRequired,
    // populated by redux
    backpackApi: PropTypes.object.isRequired,
    sources: PropTypes.object.isRequired,
    validation: PropTypes.object.isRequired,
    backpackEnabled: PropTypes.bool
  };

  state = {
    dropdownOpen: false,
    backpackFilenames: [],
    backpackFilesLoading: false,
    backpackLoadError: false,
    selectedFiles: [],
    openDialog: null,
    fileImportMessage: ''
  };

  expandDropdown = () => {
    this.setState({
      dropdownOpen: true,
      backpackLoadError: false,
      selectedFiles: [],
      backpackFilenames: []
    });
    if (this.props.backpackApi.hasBackpack()) {
      this.setState({backpackFilesLoading: true});
      this.props.backpackApi.getFileList(
        this.onFileListLoadError,
        this.onFileListLoadSuccess
      );
    }
  };

  handleImport = () => {
    const {selectedFiles} = this.state;
    if (selectedFiles.length > 0) {
      this.validateAndImportFiles(
        this.importFiles,
        this.showImportWarning,
        this.showImportError
      );
    }
  };

  importFiles = selectedFiles => {
    let failedServerImportFiles = [];
    selectedFiles.forEach(filename => {
      this.props.backpackApi.fetchFile(
        filename,
        () => failedServerImportFiles.push(filename),
        fileContents =>
          this.props.onImport(filename, fileContents) /* onSuccess */
      );
    });

    if (failedServerImportFiles.length > 0) {
      this.showImportError(failedServerImportFiles, false);
    } else {
      this.collapseDropdown();
    }
  };

  showImportWarning = files => {
    this.setState({
      openDialog: Dialog.IMPORT_WARNING,
      fileImportMessage: this.getFileImportMessage(
        true,
        files,
        javalabMsg.fileImportWarning()
      )
    });
  };

  showImportError = (files, isValidationError) => {
    this.setState({
      openDialog: Dialog.IMPORT_ERROR,
      dropdownOpen: false,
      fileImportMessage: this.getFileImportMessage(
        false,
        files,
        isValidationError
          ? javalabMsg.fileImportError()
          : javalabMsg.fileImportServerError()
      )
    });
  };

  validateAndImportFiles = (successCallback, warnCallback, errorCallback) => {
    let hiddenFilenamesUsed = [];
    let visibleFilenamesUsed = [];
    const {selectedFiles} = this.state;
    const {sources, validation} = this.props;

    selectedFiles.forEach(filename => {
      const source = sources[filename];
      if (source) {
        if (source.isVisible) {
          visibleFilenamesUsed.push(filename);
        } else {
          hiddenFilenamesUsed.push(filename);
        }
      }

      if (Object.keys(validation).includes(filename)) {
        hiddenFilenamesUsed.push(filename);
      }
    });

    if (hiddenFilenamesUsed.length > 0) {
      errorCallback(hiddenFilenamesUsed, true);
    } else if (visibleFilenamesUsed.length > 0) {
      warnCallback(visibleFilenamesUsed);
    } else {
      successCallback(selectedFiles);
    }
  };

  collapseDropdown = () => {
    this.setState({
      dropdownOpen: false,
      fileImportMessage: '',
      openDialog: null
    });
  };

  handleClickOutside = () => {
    if (this.state.dropdownOpen) {
      this.collapseDropdown();
    }
  };

  toggleDropdown = () => {
    if (this.state.dropdownOpen) {
      this.collapseDropdown();
    } else {
      this.expandDropdown();
    }
  };

  onFileListLoadError = () => {
    this.setState({
      backpackLoadError: true,
      backpackFilesLoading: false
    });
  };

  onFileListLoadSuccess = filenames => {
    this.setState({
      backpackFilenames: filenames,
      backpackFilesLoading: false,
      backpackLoadError: false
    });
  };

  handleFileCheckboxChange = event => {
    const filename = event.target.name;
    const filenameIndex = this.state.selectedFiles.indexOf(filename);
    if (event.target.checked && filenameIndex < 0) {
      this.setState({
        selectedFiles: [...this.state.selectedFiles, filename]
      });
    } else if (!event.target.checked && filenameIndex >= 0) {
      const newFileList = [...this.state.selectedFiles];
      newFileList.splice(filenameIndex, 1);
      this.setState({
        selectedFiles: newFileList
      });
    }
  };

  getFileImportMessage = (isWarning, overwriteFileList, message) => {
    return (
      <div>
        <p>{message}</p>
        <ul style={styles.importMessageList}>
          {overwriteFileList.map(filename => {
            return <li key={filename}>{filename}</li>;
          })}
        </ul>
        {isWarning && (
          <p style={styles.importWarningConfirm}>
            {javalabMsg.fileImportWarningConfirm()}
          </p>
        )}
      </div>
    );
  };

  render() {
    // Display nothing if the backpack feature is disabled
    if (!this.props.backpackEnabled) {
      return null;
    }
    const {displayTheme, isButtonDisabled} = this.props;
    const {
      dropdownOpen,
      backpackFilenames,
      backpackFilesLoading,
      backpackLoadError,
      selectedFiles,
      openDialog,
      fileImportMessage
    } = this.state;

    const showFiles =
      backpackFilenames.length > 0 &&
      !backpackFilesLoading &&
      !backpackLoadError;
    const showNoFiles =
      !backpackFilesLoading &&
      !backpackLoadError &&
      backpackFilenames.length === 0;

    const backpackIcon = (
      <i style={{marginRight: 8, fontSize: 13}}>
        <img
          src="/blockly/media/javalab/backpack.png"
          alt="backpack icon"
          style={styles.backpackIcon}
        />
      </i>
    );

    // Use PaneButton as primary Backpack button
    // to align with other buttons in the JavalabEditor header,
    // which all use PaneButton.
    return (
      <>
        <PaneButton
          id="javalab-editor-backpack"
          icon={backpackIcon}
          onClick={this.toggleDropdown}
          headerHasFocus
          isRtl={false}
          label={javalabMsg.backpackLabel()}
          leftJustified
          isDisabled={isButtonDisabled}
          style={{
            ...(dropdownOpen && styles.dropdownOpenButton)
          }}
        />
        {dropdownOpen && (
          <div
            className="ignore-react-onclickoutside"
            style={{
              ...styles.dropdownContainer,
              ...(displayTheme === DisplayTheme.DARK && styles.dropdownDark)
            }}
          >
            {showFiles && (
              <>
                <div
                  style={styles.dropdown}
                  ref={ref => (this.dropdownList = ref)}
                >
                  {/* In the case of a very long filename, this div adds styling
                  that maintains highlighting even when scrolled to the right */}
                  <div style={styles.listContainer}>
                    {backpackFilenames.map((filename, index) => (
                      <div
                        style={{
                          ...styles.fileListItem,
                          ...(displayTheme === DisplayTheme.DARK &&
                            styles.fileListItemDark)
                        }}
                        key={`backpack-file-${index}`}
                      >
                        <input
                          type="checkbox"
                          id={`backpack-file-${index}`}
                          name={filename}
                          onChange={this.handleFileCheckboxChange}
                        />
                        <label
                          htmlFor={`backpack-file-${index}`}
                          style={styles.fileListLabel}
                        >
                          {filename}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                <JavalabButton
                  text={javalabMsg.import()}
                  style={styles.importButton}
                  onClick={this.handleImport}
                  isDisabled={selectedFiles.length === 0}
                />
              </>
            )}
            {backpackFilesLoading && (
              <div style={styles.spinnerContainer}>
                <span
                  className="fa fa-spin fa-spinner"
                  style={styles.spinner}
                />
              </div>
            )}
            {backpackLoadError && (
              <div style={styles.message}>
                {javalabMsg.backpackListLoadError()}
              </div>
            )}
            {showNoFiles && (
              <div style={styles.message}>
                {javalabMsg.emptyBackpackMessage()}
              </div>
            )}
          </div>
        )}
        <JavalabDialog
          className="ignore-react-onclickoutside"
          isOpen={openDialog === Dialog.IMPORT_WARNING}
          handleConfirm={() => this.importFiles(selectedFiles)}
          handleClose={() => this.setState({openDialog: null})}
          message={fileImportMessage}
          displayTheme={displayTheme}
          confirmButtonText={javalabMsg.replace()}
          closeButtonText={javalabMsg.cancel()}
        />
        <JavalabDialog
          className="ignore-react-onclickoutside"
          isOpen={openDialog === Dialog.IMPORT_ERROR}
          handleConfirm={() => this.setState({openDialog: null})}
          message={fileImportMessage}
          displayTheme={displayTheme}
          confirmButtonText={msg.dialogOK()}
        />
      </>
    );
  }
}

const styles = {
  dropdownContainer: {
    display: 'flex',
    position: 'absolute',
    flexDirection: 'column',
    top: 30,
    backgroundColor: color.white,
    zIndex: 20,
    borderWidth: 1,
    borderColor: color.light_gray,
    borderStyle: 'solid',
    borderRadius: 4,
    maxWidth: '35%',
    maxHeight: '80%',
    minWidth: 150,
    color: color.dark_charcoal,
    marginLeft: 3
  },
  dropdown: {
    overflow: 'auto',
    padding: '10px 0',
    minWidth: 'inherit'
  },
  dropdownDark: {
    backgroundColor: color.darkest_slate_gray,
    color: color.background_gray
  },
  listContainer: {
    width: 'fit-content',
    minWidth: 'inherit'
  },
  dropdownOpenButton: {
    backgroundColor: color.cyan
  },
  fileListItem: {
    display: 'flex',
    flexDirection: 'row',
    boxSizing: 'border-box',
    padding: '5px 15px',
    width: '100%',
    ':hover': {
      backgroundColor: color.background_gray
    }
  },
  fileListItemDark: {
    ':hover': {
      backgroundColor: color.dark_charcoal
    }
  },
  fileListLabel: {
    marginLeft: 5,
    width: 'inherit'
  },
  importButton: {
    backgroundColor: color.orange,
    color: color.white,
    fontSize: 13,
    padding: '5px 16px',
    width: 'fit-content',
    borderColor: color.orange,
    ':disabled': {
      borderColor: color.light_gray
    }
  },
  backpackIcon: {
    height: 15,
    opacity: 1
  },
  spinner: {
    fontSize: 22
  },
  message: {
    fontStyle: 'italic',
    fontSize: 12,
    lineHeight: '12px',
    padding: 10
  },
  importMessageList: {
    marginBottom: 0
  },
  importWarningConfirm: {
    marginTop: 10,
    marginBottom: 0
  },
  spinnerContainer: {
    textAlign: 'center'
  }
};

export const UnconnectedBackpack = Backpack;
export default connect(state => ({
  backpackApi: state.javalab.backpackApi,
  sources: state.javalab.sources,
  validation: state.javalab.validation,
  backpackEnabled: state.javalab.backpackEnabled
}))(onClickOutside(Radium(UnconnectedBackpack)));
